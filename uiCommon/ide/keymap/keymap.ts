import { EditorAction } from "./types";
import {
  jumpToDefnAction,
  jumpToFirstUsageAction,
  jumpToErrorAction,
  jumpToFirstPlaceholderAction,
} from "./jumpTo";
import { renameRefactorAction } from "./rename";

// matches uiCommon/ide/editor.tsx
// TODO: DRY up
export const keyMap: { [key: string]: EditorAction } = {
  b: jumpToDefnAction,
  u: jumpToFirstUsageAction,
  e: jumpToErrorAction,
  j: renameRefactorAction, // would choose cmd+r, but it's taken
  // i: jumpToFirstPlaceholderAction,
  // TODO: re-enable this; monaco doesn't have support for it
};
