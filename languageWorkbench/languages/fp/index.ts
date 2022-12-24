import { LanguageSpec } from "../../commonDL/types";
// @ts-ignore
import datalog from "./fp.dl";
// @ts-ignore
import grammar from "./fp.grammar";
// @ts-ignore
import example from "./example.txt";

export const fp: LanguageSpec = {
  name: "fp",
  datalog,
  grammar,
  example,
};
