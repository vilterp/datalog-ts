import { LanguageSpec } from "../../commonDL/types";

export const plainText: LanguageSpec = {
  name: "plainText",
  datalog: "",
  grammar: `main :- repSep(., "").`,
  example: "",
};
