import { LanguageSpec, dl2 } from "../../common/types";
// @ts-ignore
import datalogTxt from "./opt.dl";
// @ts-ignore
import grammar from "./opt.grammar";
// @ts-ignore
import example from "./example.txt";

export const opt: LanguageSpec = {
  name: "opt",
  logic: dl2(datalogTxt),
  grammar,
  example,
  leaves: new Set(["ident", "stringLit", "intLit"]),
};
