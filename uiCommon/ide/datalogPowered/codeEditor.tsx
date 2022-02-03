import React, { useMemo } from "react";
import { ensureRequiredRelations } from "./requiredRelations";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import {
  formatParseError,
  getErrors,
  parse,
  TraceTree,
} from "../../../parserlib/parser";
import { extractRuleTree, RuleTree } from "../../../parserlib/ruleTree";
import { EditorBox } from "../editorCommon";
import { highlight } from "../highlight";
import { Suggestion } from "../suggestions";
import { ActionContext, EditorState } from "../types";
import { getSuggestions } from "./suggestions";
import { extractGrammar, metaGrammar } from "../../../parserlib/meta";
import { validateGrammar } from "../../../parserlib/validate";
import { getAllStatements } from "../../../parserlib/flatten";
// @ts-ignore
import mainDL from "./dl/main.dl";
import { SimpleInterpreter } from "../../../core/simple/interpreter";
import { LOADER } from "../../../apps/fp/dl";
import { ErrorList } from "../errorList";

const initInterp = new SimpleInterpreter(".", LOADER);

export function WrappedCodeEditor(props: {
  grammar: string;
  datalog: string;
  highlightCSS: string;
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
}) {
  const { finalInterp, allGrammarErrors, langParseError, dlErrors } = useMemo(
    () =>
      constructInterp({
        initInterp,
        grammarSource: props.grammar,
        cursorPos: props.editorState.cursorPos,
        dlSource: props.datalog,
        langSource: props.editorState.source,
      }),
    []
  );

  return (
    <>
      <OpenCodeEditor
        editorState={props.editorState}
        setEditorState={props.setEditorState}
        highlightCSS={props.highlightCSS}
        interp={finalInterp}
        locatedErrors={[]} // TODO: parse errors, dl errors
        validGrammar={allGrammarErrors.length === 0}
      />
      <ErrorList
        errors={[langParseError, ...dlErrors].filter((x) => x !== null)}
      />
    </>
  );
}

export function OpenCodeEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
  highlightCSS: string;
  locatedErrors: { offset: number }[];
}) {
  let highlighted: React.ReactNode = <>{props.editorState.source}</>;
  let error = null;
  if (props.validGrammar) {
    try {
      highlighted = highlight(props.interp, props.editorState.source, 0, []);
    } catch (e) {
      error = e.toString();
    }
  }

  let suggestions: Suggestion[] = [];
  try {
    suggestions = getSuggestions(props.interp);
  } catch (e) {
    console.warn("error while getting suggestions:", e);
  }

  const actionCtx: ActionContext = {
    interp: props.interp,
    state: props.editorState,
    suggestions,
    errors: props.locatedErrors,
  };

  return (
    <EditorBox
      highlightCSS={props.highlightCSS}
      actionCtx={actionCtx}
      editorState={props.editorState}
      setEditorState={props.setEditorState}
      errorsToDisplay={[]} // TODO: pass through errors
      highlighted={highlighted}
      suggestions={suggestions}
    />
  );
}

// TODO: should this be exported?
export function constructInterp({
  initInterp,
  dlSource,
  grammarSource,
  langSource,
  cursorPos,
}: {
  initInterp: AbstractInterpreter;
  dlSource: string;
  grammarSource: string;
  langSource: string;
  cursorPos: number;
}) {
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
