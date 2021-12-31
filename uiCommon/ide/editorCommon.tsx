import React from "react";
import { mapObjToList } from "../../util/util";
import { keyMap } from "./keymap";
import { ActionContext } from "./types";

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
