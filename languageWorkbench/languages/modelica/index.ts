import { LanguageSpec } from "../../commonDL/types";
// @ts-ignore
import datalog from "./modelica.dl";
// @ts-ignore
import grammar from "./modelica.grammar";
// @ts-ignore
import example from "./example.txt";

export const modelica: LanguageSpec = {
  name: "modelica",
  datalog,
  grammar,
  example,
};
