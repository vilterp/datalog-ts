import { LanguageSpec } from "../../commonDL/types";
// @ts-ignore
import datalog from "./basicBlocks.dl";
// @ts-ignore
import grammar from "./basicBlocks.grammar";
// @ts-ignore
import example from "./example.txt";

export const basicBlocks: LanguageSpec = {
  name: "basicBlocks",
  datalog,
  grammar,
  example,
};
