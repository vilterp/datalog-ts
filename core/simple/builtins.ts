import { ppt } from "../pretty";
import { int, rec, Rec, Res } from "../types";
import { termCmp } from "../unify";

export type Builtin = (rec: Rec) => Rec[];

export const BUILTINS: { [name: string]: Builtin } = {
  add,
  gte,
};

export function add(input: Rec): Rec[] {
  const a = input.attrs.a;
  const b = input.attrs.b;
  const res = input.attrs.res;
  if (a.type === "IntLit" && b.type === "IntLit" && res.type === "Var") {
    return [rec(input.relation, { a, b, res: int(a.val + b.val) })];
  }
  if (a.type === "IntLit" && res.type === "IntLit" && b.type === "Var") {
    return [rec(input.relation, { a, res, b: int(res.val - a.val) })];
  }
  if (b.type === "IntLit" && res.type === "IntLit" && a.type === "Var") {
    return [rec(input.relation, { res, b, a: int(res.val - b.val) })];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

export function gte(input: Rec): Rec[] {
  const a = input.attrs.a;
  const b = input.attrs.b;
  if (a.type !== "Var" && b.type !== "Var") {
    const res = termCmp(a, b) > 0;
    return res ? [rec("gte", { a, b })] : [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}
