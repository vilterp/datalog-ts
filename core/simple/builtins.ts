import { ppt } from "../pretty";
import { int, rec, Rec, Res } from "../types";
import { termCmp } from "../unify";

export type Builtin = (rec: Rec) => Res[];

export const BUILTINS: { [name: string]: Builtin } = {
  add,
  gte,
};

export function add(rec: Rec): Res[] {
  const a = rec.attrs.a;
  const b = rec.attrs.b;
  const res = rec.attrs.res;
  if (a.type === "IntLit" && b.type === "IntLit" && res.type === "Var") {
    return mkIntResult(a.val + b.val, res.name);
  }
  if (a.type === "IntLit" && res.type === "IntLit" && b.type === "Var") {
    return mkIntResult(res.val - a.val, b.name);
  }
  if (b.type === "IntLit" && res.type === "IntLit" && a.type === "Var") {
    return mkIntResult(res.val - b.val, a.name);
  }
  throw new Error(`this case is not supported: ${ppt(rec)}`);
}

export function gte(rec: Rec): Res[] {
  const a = rec.attrs.a;
  const b = rec.attrs.b;
  if (a.type !== "Var" && b.type !== "Var") {
    const res = termCmp(a, b) > 0;
    // console.log({ rec: ppt(rec), res });
    return res ? relationalTrue : relationalFalse;
  }
  throw new Error(`this case is not supported: ${ppt(rec)}`);
}

const relationalTrue: Res[] = [
  {
    term: rec("", {}),
    bindings: {},
    trace: { type: "BaseFactTrace" },
  },
];

const relationalFalse: Res[] = [];

function mkIntResult(val: number, outVar: string): Res[] {
  return [
    {
      term: int(val),
      bindings: {
        [outVar]: int(val),
      },
      trace: { type: "BaseFactTrace" }, // TODO: BuiltinTrace?
    },
  ];
}
