import { ppt } from "../pretty";
import { int, Rec, Res } from "../types";

export type Builtin = (rec: Rec) => Res[];

export const BUILTINS: { [name: string]: Builtin } = {
  plus,
};

export function plus(rec: Rec): Res[] {
  console.log("hello from plus", ppt(rec));
  const a = rec.attrs.a;
  const b = rec.attrs.b;
  const res = rec.attrs.res;
  if (a.type === "IntLit" && b.type === "IntLit") {
    return [
      {
        term: int(a.val + b.val),
        bindings: {},
        trace: { type: "BaseFactTrace" }, // TODO: BuiltinTrace?
      },
    ];
  }
  return [];
}
