import { assertDeepEqual, Suite } from "./testing";
import { permute } from "./util";

export const utilsTest: Suite = [
  {
    name: "permute2",
    test() {
      const input = ["a", "b"];
      const output = permute(input);
      assertDeepEqual(output, [
        ["a", "b"],
        ["b", "a"],
      ]);
    },
  },
  {
    name: "permute3",
    test() {
      const input = ["a", "b", "c"];
      const output = permute(input);
      const expected = [
        ["a", "b", "c"],
        ["b", "a", "c"],
        ["b", "c", "a"],
        ["a", "c", "b"],
        ["c", "a", "b"],
        ["c", "b", "a"],
      ];
      assertDeepEqual(output, expected);
    },
  },
];
