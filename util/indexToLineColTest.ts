import { lineAndColFromIdx } from "./indexToLineCol";
import { assertDeepEqual, Suite } from "./testBench/testing";

export const indexToLineColTests: Suite = [
  {
    name: "indexToLineCol",
    test() {
      const input = `fooooo
bar
baz baz baz`;
      const out = lineAndColFromIdx(input, 2);
      assertDeepEqual({ line: 1, col: 3 }, out);
    },
  },
];
