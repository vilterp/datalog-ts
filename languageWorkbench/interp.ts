import { AbstractInterpreter } from "../core/abstractInterpreter";
import { LanguageSpec } from "./languages";
import { parseMain } from "./languages/grammar/parser";
import {
  declareTables,
  flatten,
  getAllStatements,
  getUnionRule,
} from "./parserlib/flatten";
import {
  formatParseError,
  getErrors,
  parse,
  TraceTree,
} from "./parserlib/parser";
import { extractRuleTree, RuleTree } from "./parserlib/ruleTree";
import { parserGrammarToInternal } from "./parserlib/translateAST";
import { Grammar } from "./parserlib/types";
import { validateGrammar } from "./parserlib/validate";
import { ensureRequiredRelations } from "./requiredRelations";

type ConstructInterpRes = {
  interp: AbstractInterpreter;
  grammar: Grammar;
  errors: string[];
};

// TODO: this doesn't work that well when there are multiple languages
// we're switching between, like in the LWB...
// Is there a way to cache by object identity in javascript?
let lastInitInterp: AbstractInterpreter | null = null;
let lastLangSpec: LanguageSpec | null = null;
let lastResult: ConstructInterpRes | null = null;

function interpForLangSpec(
  initInterp: AbstractInterpreter,
  langSpec: LanguageSpec
): ConstructInterpRes {
  if (initInterp === lastInitInterp && langSpec === lastLangSpec) {
    return lastResult;
  }
  lastResult = constructInterpInner(initInterp, langSpec);
  lastInitInterp = initInterp;
  lastLangSpec = langSpec;
  return lastResult;
}

// TODO: separate function to inject the langSource
// so we can memoize that separately
function constructInterpInner(
  initInterp: AbstractInterpreter,
  langSpec: LanguageSpec
): ConstructInterpRes {
  let interp = initInterp;
  interp = interp.doLoad("main.dl");

  let dlErrors: string[] = [];

  // process grammar
  const grammarTree = parseMain(langSpec.grammar);
  const grammar = parserGrammarToInternal(grammarTree);
  const noMainError = grammar.main ? [] : ["grammar has no 'main' rule"];
  // TODO: get grammar parse errors
  const allGrammarErrors = [...noMainError];

  // add datalog
  try {
    if (langSpec.datalog.length > 0) {
      interp = interp.evalStr(langSpec.datalog)[1];
    }
  } catch (e) {
    dlErrors = [e.toString()];
  }

  return {
    interp,
    grammar,
    errors: [...allGrammarErrors, ...dlErrors],
  };
}

let lastInterpForLangSpecResult: ConstructInterpRes | null = null;
let lastSource: string = "";
let lastAddSourceResult: ConstructInterpRes | null = null;

export function constructInterp(
  initInterp: AbstractInterpreter,
  langSpec: LanguageSpec,
  source: string
) {
  const res = interpForLangSpec(initInterp, langSpec);
  if (res === lastInterpForLangSpecResult && source === lastSource) {
    return lastAddSourceResult;
  }
  const outerRes = addSourceInner(res, source);
  lastSource = source;
  lastAddSourceResult = outerRes;
  return outerRes;
}

function addSourceInner(
  res: ConstructInterpRes,
  source: string
): ConstructInterpRes {
  let interp = res.interp;

  // initialize stuff that we'll fill in later, if parse succeeds
  let traceTree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let langParseError: string | null = null;

  try {
    traceTree = parse(res.grammar, "main", source);
    ruleTree = extractRuleTree(traceTree);
    const records = flatten(ruleTree, source);
    interp = interp.bulkInsert(records);
    interp = interp.evalRawStmts(declareTables(res.grammar))[1];
    interp = interp.evalStmt({
      type: "Rule",
      rule: getUnionRule(res.grammar),
    })[1];
    interp = ensureRequiredRelations(interp);
  } catch (e) {
    langParseError = e.toString();
    console.error(e);
  }

  return {
    interp,
    grammar: res.grammar,
    errors: langParseError ? [langParseError] : [],
  };
}

export function addCursor(
  interp: AbstractInterpreter,
  cursorPos: number
): AbstractInterpreter {
  return interp.evalStr(`ide.Cursor{idx: ${cursorPos}}.`)[1];
}
