import { LanguageSpec } from "../../common/types";
// @ts-ignore
import datalog from "./json.dl";
// @ts-ignore
import grammar from "./json.grammar";
// @ts-ignore
import example from "./example.txt";

export const json: LanguageSpec = {
  name: "json",
  datalog,
  grammar,
  example,
};
