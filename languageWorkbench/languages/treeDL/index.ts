import { LanguageSpec, dl } from "../../common/types";
// @ts-ignore
import datalog from "./treeDL.dl";
// @ts-ignore
import grammar from "./treeDL.grammar";
// @ts-ignore
import example from "./example.txt";

export const treeDL: LanguageSpec = {
  name: "treeDL",
  logic: dl(datalog),
  grammar,
  example,
};
