import { ppt } from "../pretty";
import { int, Rec, Res } from "../types";

export type Builtin = (rec: Rec) => Res[];

export const BUILTINS: { [name: string]: Builtin } = {
  plus,
};

export function plus(rec: Rec): Res[] {
  const a = rec.attrs.a;
  const b = rec.attrs.b;
  const res = rec.attrs.res;
  if (a.type === "IntLit" && b.type === "IntLit") {
    return mkIntResult(a.val + b.val);
  }
  if (a.type === "IntLit" && res.type === "IntLit") {
    return mkIntResult(res.val - a.val);
  }
  if (b.type === "IntLit" && res.type === "IntLit") {
    return mkIntResult(res.val - b.val);
  }
  throw new Error(`this case supported: ${ppt(rec)}`);
}

function mkIntResult(val: number): Res[] {
  return [
    {
      term: int(val),
      bindings: {},
      trace: { type: "BaseFactTrace" }, // TODO: BuiltinTrace?
    },
  ];
}
