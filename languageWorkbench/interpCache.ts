import { AbstractInterpreter } from "../core/abstractInterpreter";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { LanguageSpec } from "./languages";
import { parseMain } from "./languages/grammar/parser";
import { declareTables, flatten, getUnionRule } from "./parserlib/flatten";
import { parse, TraceTree } from "./parserlib/parser";
import { extractRuleTree, RuleTree } from "./parserlib/ruleTree";
import { parserGrammarToInternal } from "./parserlib/translateAST";
import { Grammar } from "./parserlib/types";
import { ensureRequiredRelations } from "./requiredRelations";

type ConstructInterpRes = {
  interp: AbstractInterpreter;
  grammar: Grammar;
  errors: string[];
};

const interpCache: {
  [languageID: string]: { interp: AbstractInterpreter; grammar: Grammar };
} = {};
const docSource: { [uri: string]: string } = {};
const interpSourceCache: {
  [docURI: string]: { interp: AbstractInterpreter };
} = {};

// TODO: call this from the outside on vscode document change events
function updateDocSource(uri: string, langID: string, source: string) {
  const currentSource = docSource[uri];
  if (currentSource !== source) {
    docSource[uri] = source;
    delete interpSourceCache[`${langID}-${uri}`];
  }
}

function interpForLangSpec(
  initInterp: AbstractInterpreter,
  languages: { [langID: string]: LanguageSpec }, // TODO: check this as well
  langID: string
): { interp: AbstractInterpreter; grammar: Grammar } {
  let res = interpCache[langID];
  if (!res) {
    res = interpForLangSpecInner(initInterp, languages[langID]);
    interpCache[langID] = res;
  } else {
    console.log("cache hit", langID);
  }
  return res;
}

// TODO: separate function to inject the langSource
// so we can memoize that separately
function interpForLangSpecInner(
  initInterp: AbstractInterpreter,
  langSpec: LanguageSpec
): ConstructInterpRes {
  console.log("interpForLangSpecInner", langSpec.name);

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

export function getInterpForDoc(
  initInterp: AbstractInterpreter,
  langID: string,
  languages: { [langID: string]: LanguageSpec },
  uri: string,
  source: string
) {
  updateDocSource(uri, langID, source);
  const key = `${langID}-${uri}`;
  let res = interpSourceCache[key];
  // TODO: this is a big memory leak
  if (!res) {
    res = addSourceInner(initInterp, langID, languages, docSource[uri]);
    interpSourceCache[key] = res;
  } else {
    console.log("cache hit", langID, uri, "source length", source.length);
  }
  return res;
}

function addSourceInner(
  initInterp: AbstractInterpreter,
  langID: string,
  languages: { [langID: string]: LanguageSpec },
  source: string
): ConstructInterpRes {
  let { interp, grammar } = interpForLangSpec(initInterp, languages, langID);

  // initialize stuff that we'll fill in later, if parse succeeds
  let traceTree: TraceTree = null;
  let ruleTree: RuleTree = null;
  let langParseError: string | null = null;

  try {
    traceTree = parse(grammar, "main", source);
    ruleTree = extractRuleTree(traceTree);
    const records = flatten(ruleTree, source);
    interp = interp.bulkInsert(records);
    interp = interp.evalRawStmts(declareTables(grammar))[1];
    interp = interp.evalStmt({
      type: "Rule",
      rule: getUnionRule(grammar),
    })[1];
    interp = ensureRequiredRelations(interp);
  } catch (e) {
    langParseError = e.toString();
    console.error(e);
  }

  // (interp as SimpleInterpreter).db.tables.mapEntries(([name, collection]) => {
  //   console.log(name, collection.all().toArray());
  //   return [name, collection];
  // });

  return {
    interp,
    grammar,
    errors: langParseError ? [langParseError] : [],
  };
}

export function addCursor(
  interp: AbstractInterpreter,
  cursorPos: number
): AbstractInterpreter {
  return interp.evalStr(`ide.Cursor{idx: ${cursorPos}}.`)[1];
}
