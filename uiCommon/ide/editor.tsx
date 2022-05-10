import * as monaco from "monaco-editor";
import React, { useMemo } from "react";
import { LanguageSpec } from "../../languageWorkbench/languages";
import { EditorState } from "./types";
import { LingoEditorInner } from "./editorInner";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";
import {
  addCursor,
  constructInterp,
  InterpCache,
} from "../../languageWorkbench/interp";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

type State = {
  source: string;
  cursor: number;
  interp: AbstractInterpreter;
};

export type EditorEvent =
  | { type: "UpdateCursor"; pos: number }
  | { type: "UpdateSource"; source: string };

export function update(state: State, action: EditorEvent): State {
  switch (action.type) {
    case "UpdateCursor":
      return { ...state, cursor: action.pos };
    case "UpdateSource": {
      const res = constructInterp(XXXX);
      return { ...state, interp: res.res.interp };
    }
  }
}

export function LingoEditor(props: {
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  langSpec: LanguageSpec;
  interpCache: InterpCache;
  setInterpCache: (c: InterpCache) => void;
  fileName: string;
  width?: number;
  height?: number;
  lineNumbers?: monaco.editor.LineNumbersType;
  showKeyBindingsTable?: boolean;
}) {
  console.log("render editor", props.editorState);
  // constructInterp has its own memoization, but that doesn't work across multiple LingoEditor
  // instances... sigh
  const cacheRes = constructInterp(
    props.interpCache,
    INIT_INTERP,
    props.fileName,
    props.langSpec,
    props.editorState.source
  );
  if (cacheRes.res != props.interpCache[props.fileName].lastResult) {
    props.setInterpCache();
  }

  return (
    <LingoEditorInner
      interp={interp}
      editorState={props.editorState}
      setEditorState={props.setEditorState}
      langSpec={props.langSpec}
      width={props.width}
      height={props.height}
      lineNumbers={props.lineNumbers}
      showKeyBindingsTable={props.showKeyBindingsTable}
    />
  );
}
