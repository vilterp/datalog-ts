export type MutationDefn = Expr;

type Expr =
  | { type: "Lambda"; args: string[]; body: Expr }
  | { type: "Do"; ops: Expr[] }
  | { type: "Read"; key: Expr }
  | { type: "Write"; key: Expr; val: Expr }
  | { type: "Let"; varName: string; val: Expr }
  | {
      type: "If";
      cond: Expr;
      ifTrue: Expr;
      ifFalse: Expr;
    };
