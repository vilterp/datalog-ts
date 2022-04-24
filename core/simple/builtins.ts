import { ppt } from "../pretty";
import { int, Rec, Res } from "../types";

export type Builtin = (rec: Rec) => Res[];

export const BUILTINS: { [name: string]: Builtin } = {
  add,
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
