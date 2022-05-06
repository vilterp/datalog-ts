import React from "react";
import { useMemo } from "react";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { EditorState } from "./types";
import { LOADER } from "../../languageWorkbench/common";
// @ts-ignore
import mainDL from "../../../languageWorkbench/common/main.dl";
import { OpenCodeEditor } from "./openCodeEditor";
import { ErrorList } from "./errorList";
import { addCursor, constructInterp } from "../../languageWorkbench/interp";

const initInterp = new SimpleInterpreter(".", LOADER);

export function WrappedCodeEditor(props: {
  grammar: string;
  datalog: string;
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  lang: string;
  autofocus?: boolean;
  width?: number;
  height?: number;
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
    [props.editorState.cursorPos, withoutCursor]
  );

  return (
    <>
      <OpenCodeEditor
        editorState={props.editorState}
        setEditorState={props.setEditorState}
        interp={finalInterp}
        locatedErrors={[]} // TODO: parse errors, dl errors
        validGrammar={allGrammarErrors.length === 0}
        lang={props.lang}
        autofocus={props.autofocus}
        width={props.width}
        height={props.height}
      />
      <ErrorList
        errors={[langParseError, ...dlErrors].filter((x) => x !== null)}
      />
    </>
  );
}
