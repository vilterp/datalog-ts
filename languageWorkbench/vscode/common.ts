// needs to match https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-classification

import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { rec } from "../../core/types";
import { LOADER } from "../commonDL";
import { constructInterp } from "../interp";
import { LanguageSpec } from "../languages";

// needs to match highlight.dl
export const TOKEN_TYPES = [
  "number",
  "string",
  "keyword",
  "comment",
  "variable",
  "typeParameter",
];

export const INIT_INTERP = new SimpleInterpreter(".", LOADER);

export function getInterp(
  language: LanguageSpec,
  source: string
): AbstractInterpreter {
  const res = constructInterp(INIT_INTERP, language, source);
  // TODO: something with errors if they're there
  return res.interp;
}

// TODO: parameterize by language
export const GLOBAL_SCOPE = rec("global", {});
