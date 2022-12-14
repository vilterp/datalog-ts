type IRNode =
  | {
      type: "Loop";
      relation: RelExpr;
      loopVar: string;
      inner: IRNode;
    }
  | { type: "If"; cond: ScalarExpr }
  | { type: "Emit"; tuple: { [key: string]: ScalarExpr } };

// TODO: distinguish between base and derived relations?
type RelExpr = { relationName: string; arguments: ScalarExpr[] };

type ScalarExpr =
  | { type: "Var"; name: string }
  | { type: "Accessor"; inner: ScalarExpr; member: string }
  | { type: "IsEmpty"; inner: RelExpr };
