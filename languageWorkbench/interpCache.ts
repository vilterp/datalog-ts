import { AbstractInterpreter } from "../core/abstractInterpreter";
import { LanguageSpec } from "./common/types";
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

export class InterpCache {
  interpCache: {
    [languageID: string]: { interp: AbstractInterpreter; grammar: Grammar };
  };
  docSource: { [uri: string]: string };
  interpSourceCache: {
    [docURI: string]: { interp: AbstractInterpreter };
  };

  constructor() {
    this.interpCache = {};
    this.docSource = {};
    this.interpSourceCache = {};
  }

  getInterpForDoc(
    initInterp: AbstractInterpreter,
    langID: string,
    languages: { [langID: string]: LanguageSpec },
    uri: string,
    source: string
  ): { interp: AbstractInterpreter } {
    this.updateDocSource(uri, langID, source);
    const key = `${langID}-${uri}`;
    let res = this.interpSourceCache[key];
    // TODO: this is a big memory leak
    if (!res) {
      res = this.addSourceInner(
        initInterp,
        langID,
        languages,
        this.docSource[uri]
      );
      this.interpSourceCache[key] = res;
    } else {
      // console.log("cache hit", langID, uri, "source length", source.length);
    }
    return res;
  }

  // TODO: remove this hack
  clear() {
    for (const key in this.interpCache) {
      delete this.interpCache[key];
    }
    for (const key in this.interpSourceCache) {
      delete this.interpSourceCache[key];
    }
  }

  // TODO: call this from the outside on vscode document change events
  updateDocSource(uri: string, langID: string, source: string) {
    const currentSource = this.docSource[uri];
    if (currentSource !== source) {
      this.docSource[uri] = source;
      // TODO: factor invalidation out into a framework
      delete this.interpSourceCache[`${langID}-${uri}`];
    }
  }

  private interpForLangSpec(
    initInterp: AbstractInterpreter,
    languages: { [langID: string]: LanguageSpec }, // TODO: check this as well
    langID: string
  ): { interp: AbstractInterpreter; grammar: Grammar } {
    let res = this.interpCache[langID];
    if (!res) {
      res = this.interpForLangSpecInner(initInterp, languages[langID]);
      this.interpCache[langID] = res;
    } else {
      // console.log("cache hit", langID);
    }
    return res;
  }

  // TODO: separate function to inject the langSource
  // so we can memoize that separately
  private interpForLangSpecInner(
    initInterp: AbstractInterpreter,
    langSpec: LanguageSpec
  ): ConstructInterpRes {
    // console.log("interpForLangSpecInner", langSpec.name);

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
      interp = interp.evalRawStmts(declareTables(grammar))[1];
      interp = interp.evalStmt({
        type: "Rule",
        rule: getUnionRule(grammar),
      })[1];
      interp = ensureRequiredRelations(interp);
    } catch (e) {
      dlErrors = [e.toString()];
    }

    return {
      interp,
      grammar,
      errors: [...allGrammarErrors, ...dlErrors],
    };
  }

  private addSourceInner(
    initInterp: AbstractInterpreter,
    langID: string,
    languages: { [langID: string]: LanguageSpec },
    source: string
  ): ConstructInterpRes {
    let { interp, grammar } = this.interpForLangSpec(
      initInterp,
      languages,
      langID
    );

    // initialize stuff that we'll fill in later, if parse succeeds
    let traceTree: TraceTree = null;
    let ruleTree: RuleTree = null;
    let langParseError: string | null = null;

    try {
      traceTree = parse(grammar, "main", source);
      ruleTree = extractRuleTree(traceTree);
      const records = flatten(ruleTree, source);
      interp = interp.bulkInsert(records);
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
}
export function addCursor(
  interp: AbstractInterpreter,
  cursorPos: number
): AbstractInterpreter {
  return interp.evalStr(`ide.Cursor{idx: ${cursorPos}}.`)[1];
}
