import { AbstractInterpreter } from "../core/abstractInterpreter";
import { LanguageSpec } from "./languages";
import { getAllStatements } from "./parserlib/flatten";
import { extractGrammar, metaGrammar } from "./parserlib/meta";
import {
  formatParseError,
  getErrors,
  parse,
  TraceTree,
} from "./parserlib/parser";
import { extractRuleTree, RuleTree } from "./parserlib/ruleTree";
import { validateGrammar } from "./parserlib/validate";
import { ensureRequiredRelations } from "./requiredRelations";

// TODO: push memoization in here? idk
// TODO: separate function to inject the langSource
// so we can memoize that separately
export function constructInterp(
  initInterp: AbstractInterpreter,
  spec: LanguageSpec,
  langSource: string
): {
  interp: AbstractInterpreter;
  // TODO: consolidate these into one errors list
  // with different error types
  allGrammarErrors: string[];
  langParseError: string | null;
  dlErrors: string[];
} {
  let interp = initInterp;
  interp = interp.doLoad("main.dl");

  let dlErrors: string[] = [];

  // process grammar
  const grammarTraceTree = parse(metaGrammar, "grammar", spec.grammar);
  const grammarRuleTree = extractRuleTree(grammarTraceTree);
  const grammar = extractGrammar(spec.grammar, grammarRuleTree);
  const grammarParseErrors = getErrors(spec.grammar, grammarTraceTree).map(
    formatParseError
  );
  const grammarErrors =
    grammarParseErrors.length === 0 ? validateGrammar(grammar) : [];

  const noMainError = grammar.main ? [] : ["grammar has no 'main' rule"];
  const allGrammarErrors = [
    ...grammarErrors,
    ...grammarParseErrors,
    ...noMainError,
  ];

  // add datalog
  try {
    if (spec.datalog.length > 0) {
      interp = interp.evalStr(spec.datalog)[1];
    }
  } catch (e) {
    dlErrors = [e.toString()];
  }

  // initialize stuff that we'll fill in later, if parse succeeds
  let traceTree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let langParseError: string | null = null;

  if (allGrammarErrors.length === 0) {
    try {
      traceTree = parse(grammar, "main", langSource);
      ruleTree = extractRuleTree(traceTree);
      const flattenStmts = getAllStatements(grammar, ruleTree, langSource);
      interp = interp.evalStmts(flattenStmts)[1];
      interp = ensureRequiredRelations(interp);
    } catch (e) {
      langParseError = e.toString();
      console.error(e);
    }
  }

  return {
    interp,
    allGrammarErrors,
    langParseError,
    dlErrors,
  };
}

export function addCursor(
  interp: AbstractInterpreter,
  cursorPos: number
): AbstractInterpreter {
  return interp.evalStr(`ide.Cursor{idx: ${cursorPos}}.`)[1];
}
