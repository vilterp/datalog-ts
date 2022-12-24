import { LanguageSpec } from "../../commonDL/types";
import { datalogLangImpl } from "./dl";
// @ts-ignore
import datalogTxt from "./dl.dl";
// @ts-ignore
import grammar from "./dl.grammar";
// @ts-ignore
import example from "./example.txt";

export const datalog: LanguageSpec = {
  name: "datalog",
  datalog: datalogTxt,
  grammar,
  example,
  // TODO: derive these from the grammar
  triggerCharacters: ["&", "|", "-", ":", "{", ","],
  // TODO: make interpreter as fast as this
  nativeImpl: datalogLangImpl,
  leaves: new Set(["ident", "stringLit", "intLit"]),
};
