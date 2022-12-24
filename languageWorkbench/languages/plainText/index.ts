import { LanguageSpec } from "../../common/types";

export const plainText: LanguageSpec = {
  name: "plainText",
  datalog: "",
  grammar: `main :- repSep(., "").`,
  example: "",
};
