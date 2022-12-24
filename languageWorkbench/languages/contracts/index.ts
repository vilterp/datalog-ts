import { LanguageSpec } from "../../common/types";
// @ts-ignore
import datalog from "./contracts.dl";
// @ts-ignore
import grammar from "./contracts.grammar";
// @ts-ignore
import example from "./example.txt";

export const contracts: LanguageSpec = {
  name: "contracts",
  datalog,
  grammar,
  example,
};
