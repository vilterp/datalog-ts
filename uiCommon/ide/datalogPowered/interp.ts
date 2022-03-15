import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { getAllStatements } from "../../../parserlib/flatten";
import { extractGrammar, metaGrammar } from "../../../parserlib/meta";
import {
  formatParseError,
  getErrors,
  parse,
  TraceTree,
} from "../../../parserlib/parser";
import { extractRuleTree, RuleTree } from "../../../parserlib/ruleTree";
import { validateGrammar } from "../../../parserlib/validate";
// @ts-ignore
import mainDL from "./dl/main.dl";
import { ensureRequiredRelations } from "./requiredRelations";

export function constructInterp(args: {
  initInterp: AbstractInterpreter;
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
  const [interpWithRules, dlErrors] = (() => {
    try {
      const result =
        dlSource.length > 0 ? initInterp.evalStr(dlSource)[1] : initInterp;
      return [result, []];
    } catch (e) {
      return [initInterp, [e.toString()]];
    }
  })();
  const noMainError = grammar.main ? [] : ["grammar has no 'main' rule"];
  const allGrammarErrors = [
    ...grammarErrors,
    ...grammarParseErrors,
    ...noMainError,
  ];

  // initialize stuff that we'll fill in later, if parse succeeds
  let traceTree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let langParseError: string | null = null;
  let finalInterp: AbstractInterpreter = interpWithRules;

  if (allGrammarErrors.length === 0) {
    try {
      traceTree = parse(grammar, "main", langSource);
      ruleTree = extractRuleTree(traceTree);
      const flattenStmts = getAllStatements(grammar, ruleTree, langSource);
      finalInterp = finalInterp.evalStmts(flattenStmts)[1];
      finalInterp = finalInterp.evalStr(mainDL)[1];
      finalInterp = ensureRequiredRelations(finalInterp);
    } catch (e) {
      langParseError = e.toString();
      console.error(e);
    }
  }
  finalInterp = finalInterp.evalStr(`ide.Cursor{idx: ${cursorPos}}.`)[1];

  return {
    finalInterp,
    allGrammarErrors,
    langParseError,
    dlErrors,
  };
}
