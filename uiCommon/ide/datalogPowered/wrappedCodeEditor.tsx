import React from "react";
import { useMemo } from "react";
import { SimpleInterpreter } from "../../../core/simple/interpreter";
import { EditorState } from "../types";
import { LOADER } from "./dl";
// @ts-ignore
import mainDL from "./dl/main.dl";
import { OpenCodeEditor } from "./openCodeEditor";
import { ErrorList } from "../errorList";
import { addCursor, constructInterp } from "./interp";

const initInterp = new SimpleInterpreter(".", LOADER);

export function WrappedCodeEditor(props: {
  grammar: string;
  datalog: string;
  highlightCSS: string;
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  lang: string;
  hideKeyBindingsTable?: boolean;
}) {
  const {
    finalInterp: withoutCursor,
    allGrammarErrors,
    langParseError,
    dlErrors,
  } = useMemo(() => {
    return constructInterp({
      initInterp,
      builtinSource: mainDL,
      grammarSource: props.grammar,
      dlSource: props.datalog,
      langSource: props.editorState.source,
    });
  }, [props.grammar, props.datalog, props.editorState.source]);

  const finalInterp = useMemo(
    () => addCursor(withoutCursor, props.editorState.cursorPos),
    [props.editorState.cursorPos]
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
        hideKeyBindingsTable={props.hideKeyBindingsTable}
        lang={props.lang}
      />
      <ErrorList
        errors={[langParseError, ...dlErrors].filter((x) => x !== null)}
      />
    </>
  );
}
