import Editor, { useMonaco } from "@monaco-editor/react";
import React, { useEffect } from "react";
import { clamp, mapObjToList } from "../../util/util";
import { keyMap } from "./keymap";
import { insertSuggestionAction, Suggestion } from "./suggestions";
import { ActionContext, EditorAction, EditorState, LangError } from "./types";

export function EditorBox(props: {
  highlightCSS: string;
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  suggestions: Suggestion[];
  errorsToDisplay: LangError[];
  actionCtx: ActionContext;
  highlighted: React.ReactNode;
  hideKeyBindingsTable?: boolean;
  autofocus?: boolean;
  width?: number;
  height?: number;
}) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      console.log("hello, this is the monaco instance!", monaco);
    }
  }, [monaco]);

  const setSource = (source: string) => {
    props.setEditorState({ ...props.editorState, source });
  };

  return (
    <div>
      <style>{props.highlightCSS}</style>
      <div style={{ display: "flex" }}>
        <div
          style={{
            width: props.width || 510,
            height: props.height || 450,
            overflow: "auto",
            border: "1px solid black",
            marginBottom: 10,
          }}
        >
          <Editor
            width={props.width}
            height={props.height}
            value={props.editorState.source}
            onChange={setSource}
          />
        </div>
        <div>
          {!props.hideKeyBindingsTable ? (
            <KeyBindingsTable actionCtx={props.actionCtx} />
          ) : null}
        </div>
      </div>
      <div style={{ fontFamily: "monospace", color: "red" }}>
        <ul>
          {props.errorsToDisplay.map((err, idx) => (
            <li key={idx}>{displayError(err)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function displayError(err: LangError) {
  switch (err.type) {
    case "ParseError":
      return `Parse error: expected ${err.expected.join(" or ")}`;
    case "EvalError":
      return `Error during datalog evaluation: ${err.err}`;
    case "Problem":
      return `Problem: ${err.problem}`;
  }
}

function KeyBindingsTable(props: { actionCtx: ActionContext }) {
  const actionAvailable = (action: EditorAction): boolean => {
    try {
      return action.available(props.actionCtx);
    } catch (e) {
      console.warn(
        `error while checking availability of action "${action.name}":`,
        e
      );
      return false;
    }
  };

  return (
    <table style={{ display: "block" }}>
      <tbody>
        {mapObjToList(keyMap, (key, action) => (
          <tr
            key={action.name}
            style={{
              color: actionAvailable(action) ? "black" : "lightgrey",
            }}
          >
            <td>⌘{key.toUpperCase()}</td>
            <td>{action.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
