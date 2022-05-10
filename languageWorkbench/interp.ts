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

// TODO: put all the data into one interpreter?
export type InterpCache = {
  [fileName: string]: InterpCacheEntry;
};

export const emptyInterpCache: InterpCache = {};

type InterpCacheEntry = {
  lastInitInterp: AbstractInterpreter;
  lastLangSpec: LanguageSpec;
  lastSource: string;
  lastResult: ConstructInterpRes;
};

// uh-oh, mutable global state!
const INTERP_CACHE: InterpCache = {};

export function constructInterp(
  initInterp: AbstractInterpreter,
  langSpec: LanguageSpec,
  fileName: string,
  source: string
): ConstructInterpRes {
  console.log("constructInterp", { langSpec, fileName, source });
  const entry = INTERP_CACHE[fileName];
  if (
    entry &&
    initInterp === entry.lastInitInterp &&
    langSpec === entry.lastLangSpec &&
    source === entry.lastSource
  ) {
    console.log("cache hit");
    return entry.lastResult;
  }
  console.log("cache miss");
  const newEntry: InterpCacheEntry = {
    lastResult: constructInterpInner(initInterp, langSpec, source),
    lastInitInterp: initInterp,
    lastLangSpec: langSpec,
    lastSource: source,
  };
  INTERP_CACHE[fileName] = newEntry;
  return newEntry.lastResult;
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
