import { repeat, flatMap } from "./util";

export type Tree<T> = { key: string; item: T; children: Tree<T>[] };

export function node<T>(key: string, item: T, children: Tree<T>[]): Tree<T> {
  return { key, item, children };
}

export function leaf<T>(key: string, item: T): Tree<T> {
  return node(key, item, []);
}

type RenderNodeFn<T> = (props: { item: T; key: string; path: T[] }) => string;

export function prettyPrintTree<T>(
  tree: Tree<T>,
  render: RenderNodeFn<T>
): string {
  return pptRecurse(0, tree, [tree.item], render).join("\n");
}

function pptRecurse<T>(
  depth: number,
  tree: Tree<T>,
  path: T[],
  render: RenderNodeFn<T>
): string[] {
  return [
    repeat(depth, "  ") + render({ item: tree.item, key: tree.key, path }),
    ...flatMap(tree.children, (child) =>
      pptRecurse(depth + 1, child, [...path, child.item], render)
    ),
  ];
}

// export function prettyPrintTree(tree: Tree): string {
//   return pp.render(100, prettyPrintNode(tree));
// }

// function prettyPrintNode(tree: Tree): pp.IDoc {
//   // console.log("ppn", tree);
//   const res = [
//     tree.body,
//     "X",
//     pp.indent(2, pp.intersperse("X", tree.children.map(prettyPrintNode))),
//     // ...(tree.children.length === 0
//     //   ? []
//     //   : [
//     //       pp.line,
//     //       pp.indent(
//     //         2,
//     //         pp.intersperse(pp.line)(tree.children.map(prettyPrintNode))
//     //       ),
//     //     ]),
//   ];
//   console.log("ppn", res);
//   return res;
// }
