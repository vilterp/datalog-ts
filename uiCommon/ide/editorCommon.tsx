import React from "react";
import { mapObjToList } from "../../util/util";
import { keyMap } from "./keymap";
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
  applyAction: (action: EditorAction, modifiedState?: EditorState) => void;
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
