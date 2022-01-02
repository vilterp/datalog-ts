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
import { ActionContext, EditorAction, EditorState, EvalError } from "./types";

export function EditorBox(props: {
  highlightCSS: string;
  editorState: EditorState;
  setEditorState: (st: EditorState) => void;
  suggestions: Suggestion[];
  errorsToDisplay: EvalError[];
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
        <Editor
          name="wut" // type error without this, even tho optional
          style={{
            fontFamily: "monospace",
            height: 150,
            width: 500,
            backgroundColor: "rgb(250, 250, 250)",
            border: "1px solid black",
            marginBottom: 10,
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
        {!props.hideKeyBindingsTable ? (
          <KeyBindingsTable actionCtx={props.actionCtx} />
        ) : null}
        <div>
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
            <li key={idx}>
              {err.type === "ParseError"
                ? `Parse error: expected ${err.expected.join(" or ")}`
                : `Eval error: ${err.err}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KeyBindingsTable(props: { actionCtx: ActionContext }) {
  const actionAvailable = (action: EditorAction): boolean => {
    try {
      return action.available(props.actionCtx);
    } catch (e) {
      console.warn(
        `error while checking availability of action "${action.name}":`,
        e.message
      );
      return false;
    }
  };

  return (
    <table>
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
          {sugg.display ? sugg.display : sugg.textToInsert}: {sugg.kind}
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
