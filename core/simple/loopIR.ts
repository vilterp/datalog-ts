import { Rec } from "../types";

export type LoopNode =
  | {
      type: "Loop";
      loopVar: string;
      relation: RelExpr;
      inner: LoopNode;
    }
  | { type: "Block"; elements: LoopNode[] }
  | { type: "If"; cond: ScalarExpr; inner: LoopNode }
  | { type: "Emit"; record: Rec };

// TODO: distinguish between base and derived relations?
export type RelExpr = {
  relationName: string;
  arguments: ScalarExpr[];
  indexLookup: { attr: string; value: ScalarExpr } | null;
};

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

export function emit(tuple: Rec): LoopNode {
  return { type: "Emit", record: tuple };
}
