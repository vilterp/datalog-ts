import React from "react";
import { mapObjToList } from "../../../util/util";
import { KeyBinding, KeyMap } from "./keymap";
import { ActionContext } from "./types";

export function KeyBindingsTable(props: {
  actionCtx: ActionContext;
  keyMap: KeyMap;
}) {
  const actionAvailable = (action: KeyBinding): boolean => {
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
        {mapObjToList(props.keyMap, (actionID, action) => (
          <tr
            key={action.name}
            style={{
              color: actionAvailable(action) ? "black" : "lightgrey",
            }}
          >
            <td>⌘{action.letter.toUpperCase()}</td>
            <td>{action.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
