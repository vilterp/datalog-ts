import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { rec } from "../../core/types";
import { LOADER } from "../common";
import { LanguageSpec } from "../common/types";
import { getInterpForDoc } from "../interpCache";

// needs to match https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#semantic-token-classification
// and highlight.dl
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
  uri: string,
  source: string
): AbstractInterpreter {
  console.log("getInterp", language.name);
  const res = getInterpForDoc(
    INIT_INTERP,
    language.name,
    { [language.name]: language },
    uri,
    source
  );
  // TODO: something with errors if they're there
  return res.interp;
}

// TODO: parameterize by language
export const GLOBAL_SCOPE = rec("global", {});
