import * as monaco from "monaco-editor";

export type KeyMap = {
  [actionID: string]: { combo: number; letter: string };
};

// TODO: DRY up
export const DEFAULT_KEY_MAP: KeyMap = {
  "editor.action.revealDefinition": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
    letter: "b",
  },
  "editor.action.goToReferences": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU,
    letter: "u",
  },
  "editor.action.marker.next": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
    letter: "e",
  },
  "editor.action.rename": {
    combo: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ,
    letter: "j",
  },
};
