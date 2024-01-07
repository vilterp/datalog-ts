import * as monaco from "monaco-editor";
import { EditorAction } from "./types";
import {
  jumpToDefnAction,
  jumpToFirstUsageAction,
  jumpToErrorAction,
} from "./jumpTo";
import { renameRefactorAction } from "./rename";

// matches uiCommon/ide/editor.tsx
// TODO: DRY up
export const KEY_MAP: { [key: string]: EditorAction } = {
  b: jumpToDefnAction,
  u: jumpToFirstUsageAction,
  e: jumpToErrorAction,
  j: renameRefactorAction, // would choose cmd+r, but it's taken
  // i: jumpToFirstPlaceholderAction,
  // TODO: re-enable this; monaco doesn't have support for it
};

export type KeyMap = { [actionID: string]: number };

// TODO: DRY up
export const DEFAULT_KEY_MAP: KeyMap = {
  "editor.action.revealDefinition": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
  "editor.action.goToReferences": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU,
  "editor.action.marker.next": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
  "editor.action.rename": monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ,
};
