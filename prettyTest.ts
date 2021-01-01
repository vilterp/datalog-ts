import { str } from "./types";
import { prettyPrintTerm } from "./pretty";
import { assertStringEqual } from "./util/testing";
import * as pp from "prettier-printer";

export const prettyPrintTests = [
  {
    name: "stringNewline",
    test() {
      const term = str("hello\nworld");
      const expected = '"hello\\nworld"';
      const actual = prettyPrintTerm(term);
      assertStringEqual(expected, actual);
    },
  },
];
