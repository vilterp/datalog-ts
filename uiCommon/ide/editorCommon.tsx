import React from "react";
import { clamp, mapObjToList } from "../../util/util";
import Editor from "./editor";
import {
  keyMap,
  KEY_A,
  KEY_DOWN_ARROW,
  KEY_ENTER,
  KEY_UP_ARROW,
  KEY_Z,
} from "./keymap";
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
}) {
  const setCursorPos = (pos: number) => {
    return props.setEditorState({
      ...props.editorState,
      cursorPos: pos,
    });
  };

  const applyAction = (action: EditorAction) => {
    if (action.available(props.actionCtx)) {
      props.setEditorState(action.apply(props.actionCtx));
    }
  };

  return (
    <div>
      <style>{props.highlightCSS}</style>
      <div style={{ display: "flex" }}>
        <div
          style={{
            width: 510,
            height: 400,
            overflow: "auto",
            border: "1px solid black",
            marginBottom: 10,
          }}
        >
          <Editor
            name="wut" // type error without this, even tho optional
            style={{
              fontFamily: "monospace",
              minWidth: "100%",
              minHeight: "100%",
              whiteSpace: "pre",
              backgroundColor: "rgb(250, 250, 250)",
            }}
            autoFocus={true}
            padding={10}
            value={props.editorState.source}
            onValueChange={(source) =>
              props.setEditorState({ ...props.editorState, source })
            }
            cursorPos={props.editorState.cursorPos} // would be nice if we could have an onCursorPos
            highlight={(_) => props.highlighted}
            onKeyDown={(evt) => {
              handleKeyDown(
                evt,
                props.suggestions,
                props.editorState,
                props.setEditorState,
                applyAction
              );
            }}
            onKeyUp={(evt) => setCursorPos(evt.currentTarget.selectionStart)}
            onClick={(evt) => setCursorPos(evt.currentTarget.selectionStart)}
          />
        </div>
        <div>
          {!props.hideKeyBindingsTable ? (
            <KeyBindingsTable actionCtx={props.actionCtx} />
          ) : null}
          <SuggestionsList
            suggestions={props.suggestions}
            applyAction={applyAction}
            editorState={props.editorState}
          />
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

function SuggestionsList(props: {
  suggestions: Suggestion[];
  applyAction: (action: EditorAction) => void;
  editorState: EditorState;
}) {
  return (
    <ul style={{ fontFamily: "monospace" }}>
      {props.suggestions.map((sugg, idx) => (
        <li
          key={JSON.stringify(sugg)}
          style={{
            cursor: "pointer",
            fontWeight: sugg.bold ? "bold" : "normal",
            textDecoration:
              props.editorState.selectedSuggIdx === idx ? "underline" : "none",
          }}
          onClick={() => {
            props.applyAction(insertSuggestionAction);
          }}
        >
          {sugg.display ? sugg.display : sugg.textToInsert}
          {sugg.kind ? `: ${sugg.kind}` : null}
        </li>
      ))}
    </ul>
  );
}

function handleKeyDown(
  evt: React.KeyboardEvent<HTMLTextAreaElement>,
  suggestions: Suggestion[],
  editorState: EditorState,
  setState: (st: EditorState) => void,
  applyAction: (action: EditorAction) => void
) {
  const haveSuggestions = suggestions.length > 0;
  const clampSuggIdx = (n: number) => clamp(n, [0, suggestions.length - 1]);
  if (haveSuggestions) {
    switch (evt.keyCode) {
      case KEY_DOWN_ARROW:
        evt.preventDefault();
        setState({
          ...editorState,
          selectedSuggIdx: clampSuggIdx(editorState.selectedSuggIdx + 1),
        });
        return;
      case KEY_UP_ARROW:
        if (editorState.selectedSuggIdx > 0) {
          evt.preventDefault();
          setState({
            ...editorState,
            selectedSuggIdx: clampSuggIdx(editorState.selectedSuggIdx - 1),
          });
          return;
        }
        return;
      case KEY_ENTER:
        evt.preventDefault();
        applyAction(insertSuggestionAction);
        return;
    }
  }
  if (evt.metaKey) {
    if (KEY_A <= evt.keyCode && evt.keyCode <= KEY_Z) {
      const action = keyMap[evt.key];
      if (!action) {
        return;
      }
      applyAction(action);
      return;
    }
  }
}
