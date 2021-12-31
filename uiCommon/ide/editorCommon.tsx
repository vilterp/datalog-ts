import React from "react";
import { clamp, mapObjToList } from "../../util/util";
import {
  keyMap,
  KEY_A,
  KEY_DOWN_ARROW,
  KEY_ENTER,
  KEY_UP_ARROW,
  KEY_Z,
} from "./keymap";
import { insertSuggestionAction, Suggestion } from "./suggestions";
import { ActionContext, EditorAction, EditorState } from "./types";

export function KeyBindingsTable(props: { actionCtx: ActionContext }) {
  return (
    <table>
      <tbody>
        {mapObjToList(keyMap, (key, action) => (
          <tr
            key={action.name}
            style={{
              color: action.available(props.actionCtx) ? "black" : "lightgrey",
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

export function SuggestionsList(props: {
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

export function handleKeyDown(
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
