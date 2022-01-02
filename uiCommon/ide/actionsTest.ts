import { Suite, assertDeepEqual } from "../../util/testBench/testing";
import { getNewSpans } from "./rename";

export const actionsTests: Suite = [
  {
    name: "rename/getNewSpans",
    test() {
      const spans = [
        { from: 4, to: 5 },
        { from: 13, to: 14 },
        { from: 18, to: 19 },
      ];
      const newSpans = getNewSpans(spans, 2);
      assertDeepEqual(
        [
          { from: 4, to: 6 }, // => offset 1
          { from: 14, to: 16 }, // => offset 2
          { from: 20, to: 22 },
        ],
        newSpans
      );
    },
  },
];
