import { Suite, assertStringEqual } from "./util/testing";
import { insertAtPath, Tree } from "./tree";
import { prettyPrintTree } from "./pretty";

export const treeTests: Suite = [
  {
    name: "insertAtPath",
    test() {
      const items = ["a.1", "a.2", "b", "c.3"];
      const root: Tree<string> = { key: "root", item: "root", children: [] };
      const inserted = items.reduce<Tree<string>>(
        (tree, item) =>
          insertAtPath(
            tree,
            item.split("."),
            { key: item, item, children: [] },
            (seg) => seg
          ),
        root
      );
      assertStringEqual(
        `root
  a
    a.1
    a.2
  b
  c
    c.3`,
        prettyPrintTree(inserted, (x) => x.item)
      );
    },
  },
];
