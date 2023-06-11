import { array, Bindings, rec, str, Term, VarMappings } from "./types";
import { mapObj, mapObjToList } from "../util/util";
import { jsonEq } from "../util/json";
import { ppt } from "./pretty";

export function unify(
  prior: Bindings,
  left: Term,
  right: Term
): Bindings | null {
  // console.group("unify", {
  //   prior: ppb(prior),
  //   left: ppt(left),
  //   right: ppt(right),
  // });
  const res = doUnify(prior, left, right);
  // console.groupEnd();
  // console.log("res", res ? ppb(res) : null);
  return res;
}

function doUnify(prior: Bindings, left: Term, right: Term): Bindings | null {
  switch (left.type) {
    case "StringLit":
    case "IntLit":
    case "Bool":
      if (right.type === left.type) {
        return left.val === right.val ? {} : null;
      } else if (right.type === "Var") {
        return { [right.name]: left };
      } else {
        return null;
      }
    case "Var":
      const priorBinding = prior[left.name];
      if (priorBinding) {
        if (priorBinding.type === "Var") {
          return { [left.name]: right };
        }
        if (unify({}, priorBinding, right)) {
          return { [left.name]: right };
        }
        return null;
      }
      return { [left.name]: right };
    case "Record": {
      switch (right.type) {
        case "Record":
          if (left.relation !== right.relation) {
            return null;
          }
          let accum = {};
          for (const key of Object.keys(left.attrs)) {
            // TODO: do bindings fold across keys... how would that be ordered...
            const leftVal = left.attrs[key];
            const rightVal = right.attrs[key];
            if (!rightVal) {
              continue;
            }
            const res = unify(prior, leftVal, rightVal);
            if (res === null) {
              return null; // TODO: error message here would be nice saying what we can't unify
            }
            accum = { ...accum, ...res };
          }
          return accum;
        case "Var":
          return { [right.name]: left };
        default:
          return null;
      }
    }
    case "Array":
      switch (right.type) {
        case "Array":
          if (left.items.length != right.items.length) {
            return null;
          }
          let accum = {};
          for (let i = 0; i < left.items.length; i++) {
            const leftItem = left.items[i];
            const rightItem = right.items[i];
            const res = unify(prior, leftItem, rightItem);
            if (res === null) {
              return null; // TODO: error message?
            }
            accum = { ...accum, ...res };
          }
          return accum;
        case "Var":
          return { [right.name]: left };
        default:
          return null;
      }
    case "Dict":
      switch (right.type) {
        case "Dict": {
          let accum = {};
          for (const key of Object.keys(left.map)) {
            // TODO: do bindings fold across keys... how would that be ordered...
            const leftVal = left.map[key];
            const rightVal = right.map[key];
            if (!rightVal) {
              continue;
            }
            const res = unify(prior, leftVal, rightVal);
            if (res === null) {
              return null; // TODO: error message here would be nice saying what we can't unify
            }
            accum = { ...accum, ...res };
          }
          return accum;
        }
        case "Var":
          return { [right.name]: left };
        default:
          return null;
      }
    default:
      return null;
  }
}

export function termSameType(left: Term, right: Term): boolean {
  return left.type === right.type;
}

export function termEq(left: Term, right: Term): boolean {
  return jsonEq(left, right);
}

// 0: equal
// <0: less than
// >0: greater than
export function termCmp(left: Term, right: Term): number {
  switch (left.type) {
    case "IntLit":
      switch (right.type) {
        case "IntLit":
          return left.val - right.val;
        default:
          throw new Error(`not comparable: ${ppt(left)} ${ppt(right)}`);
      }
    case "StringLit":
      switch (right.type) {
        case "StringLit":
          return left.val.localeCompare(right.val);
        default:
          throw new Error(`not comparable: ${ppt(left)} ${ppt(right)}`);
      }
    case "Array":
      switch (right.type) {
        case "Array":
          return lexicographical(left.items, right.items);
        default:
          throw new Error(`not comparable: ${ppt(left)} ${ppt(right)}`);
      }
    case "Record":
      switch (right.type) {
        case "Record": {
          const relCmp = left.relation.localeCompare(right.relation);
          if (relCmp !== 0) {
            return relCmp;
          }
          // TODO: do this comparison without materializing both left and right arrays
          const leftArr: Term[] = mapObjToList(left.attrs, (key, val) => ({
            type: "Array",
            items: [str(key), val],
          }));
          const rightArr: Term[] = mapObjToList(right.attrs, (key, val) => ({
            type: "Array",
            items: [str(key), val],
          }));
          return lexicographical(leftArr, rightArr);
        }
        default:
          throw new Error(`not comparable: ${ppt(left)} ${ppt(right)}`);
      }
    case "Dict":
      switch (right.type) {
        case "Dict": {
          // TODO: do this comparison without materializing both left and right arrays
          const leftArr: Term[] = mapObjToList(
            left.map,
            (key, val): Term => ({
              type: "Array",
              items: [str(key), val],
            })
          );
          const rightArr: Term[] = mapObjToList(
            right.map,
            (key, val): Term => ({
              type: "Array",
              items: [str(key), val],
            })
          );
          return lexicographical(leftArr, rightArr);
        }
        default:
          throw new Error(`not comparable: ${ppt(left)} ${ppt(right)}`);
      }
    default:
      throw new Error(`not comparable: ${ppt(left)} ${ppt(right)}`);
  }
}

function lexicographical(left: Term[], right: Term[]): number {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }
  if (left.length === 0) {
    return 1;
  }
  if (right.length === 0) {
    return -1;
  }
  const firstElem = termCmp(left[0], right[0]);
  if (firstElem !== 0) {
    return firstElem;
  }
  return lexicographical(left.slice(1), right.slice(1));
}

export function termLT(left: Term, right: Term): boolean {
  return termCmp(left, right) < 0;
}

export function unifyBindings(
  left: Bindings,
  right: Bindings
): Bindings | null {
  const res: Bindings = {};
  for (const leftVar of Object.keys(left)) {
    const leftTerm = left[leftVar];
    const rightTerm = right[leftVar];
    // console.log("unifyvars", leftTerm, leftVal, rightTerm);
    if (rightTerm) {
      const unifyRes = unify({}, rightTerm, leftTerm);
      if (!unifyRes) {
        return null; // TODO: nice error message showing mismatch
      }
      res[leftVar] = unifyRes[leftVar] || leftTerm;
    } else {
      res[leftVar] = leftTerm;
    }
  }
  const onlyInRight = Object.keys(right).filter((key) => !left[key]);
  for (const key of onlyInRight) {
    res[key] = right[key];
  }
  return res;
}

export function substitute(term: Term, bindings: Bindings): Term {
  switch (term.type) {
    case "Record":
      return rec(
        term.relation,
        mapObj(term.attrs, (k, t) => substitute(t, bindings))
      );
    case "Var":
      return bindings[term.name] ? bindings[term.name] : term; // TODO: handling missing. lol
    case "Array":
      return array(term.items.map((item) => substitute(item, bindings)));
    default:
      return term;
  }
}

export function applyMappings(
  headToCaller: VarMappings,
  bindings: Bindings
): Bindings {
  const out: Bindings = {};
  for (const key in bindings) {
    const callerKey = headToCaller[key];
    if (!callerKey) {
      continue;
    }
    out[callerKey] = bindings[key];
  }
  return out;
}

export function getMappings(
  head: { [p: string]: Term },
  call: { [p: string]: Term }
): VarMappings {
  const out: VarMappings = {};
  // TODO: detect parameter mismatch!
  for (const callKey in call) {
    const callTerm = call[callKey];
    const headTerm = head[callKey];
    if (headTerm?.type === "Var" && callTerm?.type === "Var") {
      out[headTerm.name] = callTerm.name;
    }
  }
  return out;
}
