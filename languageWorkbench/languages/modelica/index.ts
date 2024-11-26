import { LanguageSpec, dl } from "../../common/types";
// @ts-ignore
import datalog from "./modelica.dl";
// @ts-ignore
import grammar from "./modelica.grammar";
// @ts-ignore
import example from "./example.txt";

export const modelica: LanguageSpec = {
  name: "modelica",
  logic: dl(datalog),
  grammar,
  example,
};
