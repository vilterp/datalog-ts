import { AbstractInterpreter } from "../core/abstractInterpreter";
import { LanguageSpec } from "./languages";
import {
  declareTables,
  flatten,
  getAllStatements,
  getUnionRule,
} from "./parserlib/flatten";
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

type ConstructInterpRes = {
  interp: AbstractInterpreter;
  // TODO: consolidate these into one errors list
  // with different error types
  allGrammarErrors: string[];
  langParseError: string | null;
  dlErrors: string[];
};

// TODO: this doesn't work that well when there are multiple languages
// we're switching between, like in the LWB...
// Is there a way to cache by object identity in javascript?
let lastInitInterp: AbstractInterpreter | null = null;
let lastLangSpec: LanguageSpec | null = null;
let lastSource: string = "";
let lastResult: ConstructInterpRes | null = null;

export function constructInterp(
  initInterp: AbstractInterpreter,
  langSpec: LanguageSpec,
  source: string
): ConstructInterpRes {
  if (
    initInterp === lastInitInterp &&
    langSpec === lastLangSpec &&
    source === lastSource
  ) {
    return lastResult;
  }
  lastResult = constructInterpInner(initInterp, langSpec, source);
  lastInitInterp = initInterp;
  lastLangSpec = langSpec;
  lastSource = source;
  return lastResult;
}

// TODO: separate function to inject the langSource
// so we can memoize that separately
function constructInterpInner(
  initInterp: AbstractInterpreter,
  langSpec: LanguageSpec,
  source: string
): ConstructInterpRes {
  let interp = initInterp;
  interp = interp.doLoad("main.dl");

  let dlErrors: string[] = [];

  // process grammar
  const grammarTraceTree = parse(metaGrammar, "grammar", langSpec.grammar);
  const grammarRuleTree = extractRuleTree(grammarTraceTree);
  const grammar = extractGrammar(langSpec.grammar, grammarRuleTree);
  const grammarParseErrors = getErrors(langSpec.grammar, grammarTraceTree).map(
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
    if (langSpec.datalog.length > 0) {
      interp = interp.evalStr(langSpec.datalog)[1];
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
      traceTree = parse(grammar, "main", source);
      ruleTree = extractRuleTree(traceTree);
      const records = flatten(ruleTree, source);
      interp = interp.bulkInsert(records);
      interp = interp.evalStmts(declareTables(grammar))[1];
      interp = interp.evalStmt({
        type: "Rule",
        rule: getUnionRule(grammar),
      })[1];
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
