import { LanguageSpec, dl } from "../../common/types";
// @ts-ignore
import datalog from "./treeSQL.dl";
// @ts-ignore
import grammar from "./treeSQL.grammar";
// @ts-ignore
import example from "./example.txt";

export const treeSQL: LanguageSpec = {
  name: "treeSQL",
  logic: dl(datalog),
  grammar,
  example,
};
