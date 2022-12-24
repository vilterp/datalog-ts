import { LanguageSpec } from "../../common/types";
// @ts-ignore
import datalog from "./grammar.dl";
// @ts-ignore
import grammarTxt from "./grammar.grammar";
// @ts-ignore
import example from "./example.txt";

export const grammar: LanguageSpec = {
  name: "grammar",
  datalog,
  grammar: grammarTxt,
  example,
};
