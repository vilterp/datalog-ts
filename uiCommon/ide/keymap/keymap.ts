import * as monaco from "monaco-editor";
import { ActionContext } from "./types";
import {
  jumpToDefnAction,
  jumpToErrorAction,
  jumpToFirstPlaceholderAction,
} from "./jumpTo";
import { renameRefactorAction } from "./rename";

export type KeyMap = {
  [actionID: string]: KeyBinding;
};

export type KeyBinding = {
  combo: number;
  letter: string;
  name: string;
  available: (ctx: ActionContext) => boolean;
};

// TODO: DRY up
export const DEFAULT_KEY_MAP: KeyMap = {
  "editor.action.revealDefinition": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
    letter: "b",
    name: "Jump To Definition",
    available: jumpToDefnAction.available,
  },
  "editor.action.goToReferences": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU,
    letter: "u",
    name: "Find Usages",
    available: jumpToFirstPlaceholderAction.available,
  },
  "editor.action.marker.next": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
    letter: "e",
    name: "Next Error",
    available: jumpToErrorAction.available,
  },
  "editor.action.rename": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ,
    letter: "j",
    name: "Rename",
    available: renameRefactorAction.available,
  },
};
