import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { declareTables, getAllStatements } from "../../../parserlib/flatten";
import { extractGrammar, metaGrammar } from "../../../parserlib/meta";
import {
  formatParseError,
  getErrors,
  parse,
  TraceTree,
} from "../../../parserlib/parser";
import { extractRuleTree, RuleTree } from "../../../parserlib/ruleTree";
import { validateGrammar } from "../../../parserlib/validate";
import { ensureRequiredRelations } from "./requiredRelations";

export function constructInterp(args: {
  initInterp: AbstractInterpreter;
  builtinSource: string;
  dlSource: string;
  grammarSource: string;
  langSource: string;
  cursorPos: number;
}): {
  finalInterp: AbstractInterpreter;
  allGrammarErrors: string[];
  langParseError: string | null;
  dlErrors: string[];
} {
  const { initInterp, dlSource, grammarSource, langSource, cursorPos } = args;
  const grammarTraceTree = parse(metaGrammar, "grammar", grammarSource);
  const grammarRuleTree = extractRuleTree(grammarTraceTree);
  const grammar = extractGrammar(grammarSource, grammarRuleTree);
  const grammarParseErrors = getErrors(grammarSource, grammarTraceTree).map(
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

  // put in user rules
  const {
    interpWithRules,
    dlErrors,
  }: { interpWithRules: AbstractInterpreter; dlErrors: string[] } = (() => {
    try {
      const result =
        dlSource.length > 0 ? initInterp.evalStr(dlSource)[1] : initInterp;
      return { interpWithRules: result, dlErrors: [] };
    } catch (e) {
      return { interpWithRules: initInterp, dlErrors: [e.toString()] };
    }
  })();

  let finalInterp: AbstractInterpreter = interpWithRules;

  // put in grammar tables
  if (allGrammarErrors.length === 0) {
    finalInterp = finalInterp.evalStmts(declareTables(grammar))[1];
    finalInterp = ensureRequiredRelations(finalInterp);
  }

  // put in builtins
  finalInterp = finalInterp.evalStr(args.builtinSource)[1];

  // put in ast tuples
  let traceTree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let langParseError: string | null = null;
  try {
    traceTree = parse(grammar, "main", langSource);
    ruleTree = extractRuleTree(traceTree);
    const flattenStmts = getAllStatements(grammar, ruleTree, langSource);
    finalInterp = finalInterp.evalStmts(flattenStmts)[1];
  } catch (e) {
    langParseError = e.toString();
    console.error(e);
  }

  finalInterp = finalInterp.evalStr(`ide.Cursor{idx: ${cursorPos}}.`)[1];

  return {
    finalInterp,
    allGrammarErrors,
    langParseError,
    dlErrors,
  };
}
