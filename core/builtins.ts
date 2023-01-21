import { ppt } from "./pretty";
import { array, dict, int, rec, Rec, str, varr } from "./types";
import { termCmp, termEq } from "./unify";
import * as util from "../util/util";
import { removeKey } from "../util/util";

export type Builtin = { head: Rec; fun: (rec: Rec) => Rec[] };

export const BUILTINS: { [name: string]: Builtin } = {
  // comparisons
  "base.eq": { head: rec("base.eq", { a: varr("A"), b: varr("B") }), fun: eq },
  "base.neq": {
    head: rec("base.neq", { a: varr("A"), b: varr("B") }),
    fun: neq,
  },
  "base.lte": {
    head: rec("base.lte", { a: varr("A"), b: varr("B") }),
    fun: lte,
  },
  "base.gte": {
    head: rec("base.gte", { a: varr("A"), b: varr("B") }),
    fun: gte,
  },
  "base.lt": { head: rec("base.lt", { a: varr("A"), b: varr("B") }), fun: lt },
  "base.gt": { head: rec("base.gt", { a: varr("A"), b: varr("B") }), fun: gt },
  // arithmetic
  "base.add": {
    head: rec("base.add", { a: varr("A"), b: varr("B"), res: varr("Res") }),
    fun: add,
  },
  "base.mul": {
    head: rec("base.mul", { a: varr("A"), b: varr("B"), res: varr("Res") }),
    fun: mul,
  },
  "math.sin": {
    head: rec("math.sin", { a: varr("A"), b: varr("B"), res: varr("Res") }),
    fun: sin,
  },
  // misc
  range: {
    head: rec("range", {
      from: varr("From"),
      to: varr("To"),
      val: varr("Val"),
    }),
    fun: range,
  },
  concat: {
    head: rec("concat", { a: varr("A"), b: varr("B"), res: varr("Res") }),
    fun: concat,
  },
  invert: {
    head: rec("invert", { a: varr("A"), res: varr("Res") }),
    fun: invert,
  },
  clamp: {
    head: rec("clamp", {
      min: varr("Min"),
      max: varr("Max"),
      val: varr("Val"),
      res: varr("Res"),
    }),
    fun: clamp,
  },
  // dict
  "dict.set": {
    head: rec("dict.set", {
      in: varr("In"),
      key: varr("Key"),
      value: varr("Value"),
      out: varr("Out"),
    }),
    fun: dictSet,
  },
  "dict.item": {
    head: rec("dict.item", {
      dict: varr("Dict"),
      key: varr("Key"),
      value: varr("Value"),
    }),
    fun: dictItem,
  },
  "dict.remove": {
    head: rec("dict.remove", {
      in: varr("In"),
      key: varr("Key"),
      out: varr("Out"),
    }),
    fun: dictRemove,
  },
  // array
  "array.append": {
    head: rec("array.append", {
      in: varr("In"),
      value: varr("Value"),
      out: varr("Out"),
    }),
    fun: arrayAppend,
  },
  "array.prepend": {
    head: rec("array.prepend", {
      in: varr("In"),
      value: varr("Value"),
      out: varr("Out"),
    }),
    fun: arrayPrepend,
  },
  "array.item": {
    head: rec("array.item", {
      array: varr("Array"),
      index: varr("Index"),
      value: varr("Value"),
    }),
    fun: arrayItem,
  },
  // type tests
  "base.int": {
    head: rec("base.int", {
      a: varr("A"),
    }),
    fun: isInt,
  },
  // conversions
  intToString: {
    head: rec("intToString", {
      int: varr("Int"),
      string: varr("String"),
    }),
    fun: intToString,
  },
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

function arrayItem(input: Rec): Rec[] {
  const arrayInput = input.attrs.array;
  const index = input.attrs.index;
  const value = input.attrs.value;

  if (
    arrayInput.type === "Array" &&
    index.type === "Var" &&
    value.type === "Var"
  ) {
    return arrayInput.items.map((item, idx) =>
      rec(input.relation, {
        array: arrayInput,
        index: int(idx),
        value: item,
      })
    );
  }
  if (
    arrayInput.type === "Array" &&
    index.type === "IntLit" &&
    value.type === "Var"
  ) {
    const idx = index.val;
    if (idx >= arrayInput.items.length) {
      return [];
    }
    return [
      rec(input.relation, {
        array: arrayInput,
        index,
        value: arrayInput.items[idx],
      }),
    ];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}

function isInt(input: Rec): Rec[] {
  const a = input.attrs.a;
  return a.type === "IntLit" ? [rec(input.relation, { a })] : [];
}

function intToString(input: Rec): Rec[] {
  const intInput = input.attrs.int;
  const strInput = input.attrs.string;
  if (intInput.type === "Var" && strInput.type === "StringLit") {
    return [
      rec(input.relation, {
        int: int(parseInt(strInput.val)),
        string: strInput,
      }),
    ];
  }
  if (intInput.type === "IntLit" && strInput.type === "Var") {
    return [
      rec(input.relation, {
        int: intInput,
        string: str(intInput.val.toString()),
      }),
    ];
  }
  if (intInput.type === "IntLit" && strInput.type === "StringLit") {
    if (parseInt(strInput.val) === intInput.val) {
      return [
        rec(input.relation, {
          int: intInput,
          string: str(intInput.val.toString()),
        }),
      ];
    }
    return [];
  }
  throw new Error(`this case is not supported: ${ppt(input)}`);
}
