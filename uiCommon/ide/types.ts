import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { constructInterp } from "../../languageWorkbench/interp";
import { LanguageSpec } from "../../languageWorkbench/languages";
import { INIT_INTERP } from "../../languageWorkbench/vscode/common";

export type EditorState = {
  cursorPos: number;
  source: string;
  interp: AbstractInterpreter;
  spec: LanguageSpec;
};

export function initialEditorState(
  spec: LanguageSpec,
  source: string
): EditorState {
  const interp = constructInterp(INIT_INTERP, spec, source).interp;
  return {
    cursorPos: 0,
    source,
    interp,
    spec,
  };
}

export type LangError =
  | { type: "ParseError"; expected: string[]; offset: number }
  | { type: "EvalError"; err: Error }
  | { type: "Problem"; problem: string; offset: number };
