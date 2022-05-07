import { ppt } from "./pretty";
import { int, rec, Rec, str } from "./types";
import { termCmp } from "./unify";
import * as util from "../util/util";

export type Builtin = (rec: Rec) => Rec[];

export const BUILTINS: { [name: string]: Builtin } = {
  add,
  mul,
  gte,
  range,
  concat,
  "math.sin": sin,
  invert,
};

function add(input: Rec): Rec[] {
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
  if (b.type === "IntLit" && res.type === "IntLit" && a.type === "IntLit") {
    return a.val + b.val === res.val
      ? [rec(input.relation, { a, b, res })]
      : [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function mul(input: Rec): Rec[] {
  const a = input.attrs.a;
  const b = input.attrs.b;
  const res = input.attrs.res;
  if (a.type === "IntLit" && b.type === "IntLit" && res.type === "Var") {
    return [rec(input.relation, { a, b, res: int(a.val * b.val) })];
  }
  // TODO: more cases
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function gte(input: Rec): Rec[] {
  const a = input.attrs.a;
  const b = input.attrs.b;
  if (a.type !== "Var" && b.type !== "Var") {
    const res = termCmp(a, b) > 0;
    return res ? [rec("gte", { a, b })] : [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function range(input: Rec): Rec[] {
  const from = input.attrs.from;
  const to = input.attrs.to;
  const val = input.attrs.val;

  if (from.type === "IntLit" && to.type === "IntLit" && val.type === "Var") {
    return util
      .rangeFrom(from.val, to.val + 1)
      .map((num) => rec("range", { from, to, val: int(num) }));
  }
  if (from.type === "IntLit" && to.type === "IntLit" && val.type === "IntLit") {
    if (from.val <= val.val && val.val <= to.val) {
      return [input];
    }
    return [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function concat(input: Rec): Rec[] {
  const a = input.attrs.a;
  const b = input.attrs.b;
  const res = input.attrs.res;
  if (a.type === "StringLit" && b.type === "StringLit" && res.type === "Var") {
    return [rec(input.relation, { a, b, res: str(a.val + b.val) })];
  }
  // TODO: other combos? essentially matching? lol
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function sin(input: Rec): Rec[] {
  const a = input.attrs.a;
  const res = input.attrs.res;
  if (a.type == "IntLit" && res.type === "Var") {
    return [rec(input.relation, { a, res: int(Math.sin(a.val)) })];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

// because I'm too lazy to add negative numbers to the language
function invert(input: Rec): Rec[] {
  const a = input.attrs.a;
  const res = input.attrs.res;
  if (a.type === "IntLit" && res.type === "Var") {
    return [rec(input.relation, { a: a, res: int(-a.val) })];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}
