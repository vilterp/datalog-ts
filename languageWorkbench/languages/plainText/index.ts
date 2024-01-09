import { LanguageSpec, dl } from "../../common/types";

export const plainText: LanguageSpec = {
  name: "plainText",
  logic: dl(""),
  grammar: `main :- repSep(., "").`,
  example: "",
};
