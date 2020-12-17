import { flatMap, updateAtIdx } from "./util/util";

export type Tree<T> = { key: string; item: T; children: Tree<T>[] };

export function node<T>(key: string, item: T, children: Tree<T>[]): Tree<T> {
  return { key, item, children };
}

export function leaf<T>(key: string, item: T): Tree<T> {
  return node(key, item, []);
}

export function mapTree<T, U>(tree: Tree<T>, f: (t: T) => U): Tree<U> {
  return {
    key: tree.key,
    item: f(tree.item),
    children: tree.children.map((c) => mapTree(c, f)),
  };
}

export function filterTree<T>(tree: Tree<T>, f: (t: T) => boolean): Tree<T> {
  return {
    ...tree,
    children: tree.children
      .filter((child) => f(child.item))
      .map((child) => filterTree(child, f)),
  };
}

export function getLeaves<T>(tree: Tree<T>): T[] {
  if (tree.children.length === 0) {
    return [tree.item];
  }
  return flatMap(tree.children, getLeaves);
}

// this is a weird algorithm
export function collapseTree<T>(tree: Tree<T>, pred: (t: T) => boolean): T[] {
  if (!pred(tree.item)) {
    return flatMap(tree.children, (child) => collapseTree(child, pred));
  }
  return [
    tree.item,
    ...flatMap(tree.children, (child) => collapseTree(child, pred)),
  ];
}

export function treeToArr<T>(tree: Tree<T>): T[] {
  return [tree.item, ...flatMap(tree.children, treeToArr)];
}

export function insertAtPath<T>(
  tree: Tree<T>,
  path: string[],
  toInsert: Tree<T>,
  mkNamespaceNode: (pathSeg: string) => T
): Tree<T> {
  if (path.length === 0) {
    return toInsert;
  }
  const curSeg = path[0];
  const childIdx = tree.children.findIndex((child) => child.key === curSeg);
  return {
    ...tree,
    children:
      childIdx !== -1
        ? updateAtIdx(tree.children, childIdx, (child) =>
            insertAtPath(child, path.slice(1), toInsert, mkNamespaceNode)
          )
        : [
            ...tree.children,
            insertAtPath(
              { key: curSeg, item: mkNamespaceNode(curSeg), children: [] },
              path.slice(1),
              toInsert,
              mkNamespaceNode
            ),
          ],
  };
}
