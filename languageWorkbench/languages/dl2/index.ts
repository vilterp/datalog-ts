import { LanguageSpec, dl } from "../../common/types";
// @ts-ignore
import datalog from "./dl2.dl";
// @ts-ignore
import grammar from "./dl2.grammar";
// @ts-ignore
import example from "./example.txt";

export const datalog2: LanguageSpec = {
  name: "datalog2",
  logic: dl(datalog),
  grammar,
  example,
};
