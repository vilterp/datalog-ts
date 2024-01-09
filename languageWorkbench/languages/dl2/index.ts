import { LanguageSpec, dl2 } from "../../common/types";
// @ts-ignore
import datalog from "./dl2.dl2";
// @ts-ignore
import grammar from "./dl2.grammar";
// @ts-ignore
import example from "./example.txt";

export const datalog2: LanguageSpec = {
  name: "datalog2",
  logic: dl2(datalog),
  grammar,
  example,
};
