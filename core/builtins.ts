import { ppt } from "./pretty";
import { array, dict, int, rec, Rec, str } from "./types";
import { termCmp, termEq } from "./unify";
import * as util from "../util/util";
import { removeKey } from "../util/util";

export type Builtin = (rec: Rec) => Rec[];

export const BUILTINS: { [name: string]: Builtin } = {
  // comparisons
  "base.eq": eq,
  "base.neq": neq,
  "base.lte": lte,
  "base.gte": gte,
  "base.lt": lt,
  "base.gt": gt,
  // arithmetic
  "base.add": add,
  "base.mul": mul,
  "math.sin": sin,
  // misc
  range,
  concat,
  invert,
  clamp,
  // dict
  "dict.set": dictSet,
  "dict.item": dictItem,
  "dict.remove": dictRemove,
  // array
  "array.append": arrayAppend,
  "array.prepend": arrayPrepend,
  // value tests
  "base.int": isInt,
};

function eq(input: Rec): Rec[] {
  if (input.attrs.a.type !== "Var" && input.attrs.b.type === "Var") {
    return [rec(input.relation, { a: input.attrs.a, b: input.attrs.a })];
  }
  if (input.attrs.a.type === "Var" && input.attrs.b.type !== "Var") {
    return [rec(input.relation, { a: input.attrs.b, b: input.attrs.b })];
  }
  if (input.attrs.a.type !== "Var" && input.attrs.b.type !== "Var") {
    if (termEq(input.attrs.a, input.attrs.b)) {
      return [input];
    }
    return [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

// TODO: maybe this shouldn't be a builtin, but rather just
// negation of an eq clause?
function neq(input: Rec): Rec[] {
  if (input.attrs.a.type !== "Var" && input.attrs.b.type !== "Var") {
    if (!termEq(input.attrs.a, input.attrs.b)) {
      return [input];
    }
    return [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function lte(input: Rec): Rec[] {
  return comparison(input, (n) => n <= 0);
}

function gte(input: Rec): Rec[] {
  return comparison(input, (n) => n >= 0);
}

function lt(input: Rec): Rec[] {
  return comparison(input, (n) => n < 0);
}

function gt(input: Rec): Rec[] {
  return comparison(input, (n) => n > 0);
}

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

function clamp(input: Rec): Rec[] {
  const min = input.attrs.min;
  const max = input.attrs.max;
  const val = input.attrs.val;
  const res = input.attrs.res;
  if (
    min.type === "IntLit" &&
    max.type === "IntLit" &&
    val.type === "IntLit" &&
    res.type === "Var"
  ) {
    return [
      rec(input.relation, {
        min,
        max,
        val,
        res: int(util.clamp(val.val, [min.val, max.val])),
      }),
    ];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function comparison(input: Rec, cmp: (number: number) => boolean): Rec[] {
  if (input.attrs.a.type !== "Var" && input.attrs.b.type !== "Var") {
    const result = cmp(termCmp(input.attrs.a, input.attrs.b));
    return result ? [input] : [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

// === Dicts ===

function dictSet(input: Rec): Rec[] {
  const dictInput = input.attrs.in;
  const key = input.attrs.key;
  const value = input.attrs.value;
  const dictOutput = input.attrs.out;

  if (
    dictInput.type === "Dict" &&
    key.type === "StringLit" &&
    value.type !== "Var" &&
    dictOutput.type === "Var"
  ) {
    return [
      rec(input.relation, {
        in: dictInput,
        key,
        value,
        out: dict({
          ...dictInput.map,
          [key.val]: value,
        }),
      }),
    ];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function dictItem(input: Rec): Rec[] {
  const dictInput = input.attrs.dict;
  const key = input.attrs.key;
  const value = input.attrs.value;

  if (
    dictInput.type === "Dict" &&
    key.type === "StringLit" &&
    value.type === "Var"
  ) {
    const foundVal = dictInput.map[key.val];
    if (!foundVal) {
      return [];
    }
    return [
      rec(input.relation, {
        dict: dictInput,
        key,
        value: foundVal,
      }),
    ];
  }
  if (dictInput.type === "Dict" && key.type === "Var" && value.type === "Var") {
    return util.mapObjToList(dictInput.map, (dictKey, dictVal) =>
      rec(input.relation, {
        dict: dictInput,
        key: str(dictKey),
        value: dictVal,
      })
    );
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function dictRemove(input: Rec): Rec[] {
  const dictInput = input.attrs.in;
  const key = input.attrs.key;
  const dictOutput = input.attrs.out;

  if (
    dictInput.type === "Dict" &&
    key.type === "StringLit" &&
    dictOutput.type === "Var"
  ) {
    return [
      rec(input.relation, {
        in: dictInput,
        key,
        out: dict(removeKey(dictInput.map, key.val)),
      }),
    ];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function arrayAppend(input: Rec): Rec[] {
  const arrayInput = input.attrs.in;
  const value = input.attrs.value;
  const arrayOutput = input.attrs.out;

  if (
    arrayInput.type === "Array" &&
    value.type !== "Var" &&
    arrayOutput.type === "Var"
  ) {
    return [
      rec(input.relation, {
        in: arrayInput,
        value,
        out: array([...arrayInput.items, value]),
      }),
    ];
  }
  if (
    arrayInput.type === "Var" &&
    value.type === "Var" &&
    arrayOutput.type === "Array"
  ) {
    const items = arrayOutput.items;
    if (items.length === 0) {
      return [];
    }
    return [
      rec(input.relation, {
        in: array(items.slice(0, items.length - 1)),
        value: items[items.length - 1],
        out: arrayOutput,
      }),
    ];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function arrayPrepend(input: Rec): Rec[] {
  const arrayInput = input.attrs.in;
  const value = input.attrs.value;
  const arrayOutput = input.attrs.out;

  if (
    arrayInput.type === "Array" &&
    value.type !== "Var" &&
    arrayOutput.type === "Var"
  ) {
    return [
      rec(input.relation, {
        in: arrayInput,
        value,
        out: array([value, ...arrayInput.items]),
      }),
    ];
  }
  if (
    arrayInput.type === "Var" &&
    value.type === "Var" &&
    arrayOutput.type === "Array"
  ) {
    const items = arrayOutput.items;
    if (items.length === 0) {
      return [];
    }
    return [
      rec(input.relation, {
        in: array(items.slice(1)),
        value: items[0],
        out: arrayOutput,
      }),
    ];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function isInt(input: Rec): Rec[] {
  const a = input.attrs.a;
  return a.type === "IntLit" ? [rec(input.relation, { a })] : [];
}
