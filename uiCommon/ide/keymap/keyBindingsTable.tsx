import React from "react";
import { mapObjToList } from "../../../util/util";
import { KEY_MAP } from "./keymap";
import { ActionContext, EditorAction } from "./types";

export function KeyBindingsTable(props: { actionCtx: ActionContext }) {
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
        {mapObjToList(KEY_MAP, (key, action) => (
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
