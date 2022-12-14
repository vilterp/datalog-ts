export type LoopNode =
  | {
      type: "Loop";
      loopVar: string;
      relation: RelExpr;
      inner: LoopNode;
    }
  | { type: "Block"; elements: LoopNode[] }
  | { type: "If"; cond: ScalarExpr; inner: LoopNode }
  | { type: "Emit"; tuple: { [key: string]: ScalarExpr } };

// TODO: distinguish between base and derived relations?
export type RelExpr = { relationName: string; arguments: ScalarExpr[] };

export type ScalarExpr =
  | { type: "Var"; name: string }
  | { type: "Accessor"; inner: ScalarExpr; member: string }
  | { type: "IsEmpty"; inner: RelExpr };

export function loop(
  loopVar: string,
  relation: RelExpr,
  inner: LoopNode
): LoopNode {
  return { type: "Loop", loopVar, relation, inner };
}

export function block(elements: LoopNode[]): LoopNode {
  return { type: "Block", elements };
}

export function ifNode(cond: ScalarExpr, inner: LoopNode): LoopNode {
  return { type: "If", cond, inner };
}

export function emit(tuple: { [key: string]: ScalarExpr }): LoopNode {
  return { type: "Emit", tuple };
}
