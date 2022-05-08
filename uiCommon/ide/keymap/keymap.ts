import { EditorAction } from "./types";
import {
  jumpToDefnAction,
  jumpToFirstUsageAction,
  jumpToErrorAction,
  jumpToFirstPlaceholderAction,
} from "./jumpTo";
import { renameRefactorAction } from "./rename";

export const KEY_DOWN_ARROW = 40;
export const KEY_UP_ARROW = 38;
export const KEY_ENTER = 13;
export const KEY_A = 65;
export const KEY_Z = 90;

// currently just cmd+[key]
// TODO: other modifiers
export const keyMap: { [key: string]: EditorAction } = {
  b: jumpToDefnAction,
  u: jumpToFirstUsageAction,
  e: jumpToErrorAction,
  j: renameRefactorAction, // would choose cmd+r, but it's taken
  i: jumpToFirstPlaceholderAction,
};
