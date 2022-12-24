import { LanguageSpec } from "../../commonDL/types";
// @ts-ignore
import datalog from "./sql.dl";
// @ts-ignore
import grammar from "./sql.grammar";
// @ts-ignore
import example from "./example.txt";

export const sql: LanguageSpec = {
  name: "sql",
  datalog,
  grammar,
  example,
};
