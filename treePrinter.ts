import * as pp from "prettier-printer";

export type Tree = { body: string; children: Tree[] };

export function node(body: string, children: Tree[]): Tree {
  return { body, children };
}

export function leaf(body: string): Tree {
  return node(body, []);
}

export function prettyPrintTree(tree: Tree): string {
  return pp.render(100, prettyPrintNode(tree));
}

function prettyPrintNode(tree: Tree): pp.IDoc {
  console.log("ppn", tree);
  const res = [
    tree.body,
    ...(tree.children.length === 0
      ? []
      : [
          pp.line,
          pp.indent(
            2,
            pp.intersperse(pp.line)(tree.children.map(prettyPrintNode))
          ),
        ]),
  ];
  console.log("ppn", res);
  return res;
}
