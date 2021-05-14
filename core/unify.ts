import { Bindings, rec, Term, VarMappings } from "./types";
import { mapObj } from "../util/util";

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
        // TODO: add Var case?
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

// could use some kind of existing JS deepEq
export function termEq(left: Term, right: Term): boolean {
  if (!left || !right) {
    return false; // TODO: shouldn't get here
  }
  switch (left.type) {
    case "StringLit":
    case "IntLit":
    case "Bool":
      return left.type === right.type && left.val === right.val;
    case "Var":
      switch (right.type) {
        case "Var":
          return left.name === right.name;
        default:
          return false;
      }
    case "Record":
      switch (right.type) {
        case "Record":
          for (const key of Object.keys(left.attrs)) {
            const rightVal = right.attrs[key];
            const leftVal = left.attrs[key];
            if (!termEq(leftVal, rightVal)) {
              return false;
            }
          }
          return Object.keys(left).length === Object.keys(right).length;
        default:
          return null;
      }
  }
}

export function termLT(left: Term, right: Term): boolean {
  switch (left.type) {
    case "IntLit":
      switch (right.type) {
        case "IntLit":
          return left.val < right.val;
        default:
          return false;
      }
    case "StringLit":
      switch (right.type) {
        case "StringLit":
          return left.val < right.val;
        default:
          return false;
      }
    default:
      return false;
  }
}

export function unifyVars(left: Bindings, right: Bindings): Bindings | null {
  const res: Bindings = {};
  for (const leftKey of Object.keys(left)) {
    const leftVal = left[leftKey];
    const rightVal = right[leftKey];
    // console.log("unifyvars", leftKey, leftVal, rightVal);
    if (rightVal) {
      if (!unify({}, rightVal, leftVal)) {
        return null; // TODO: nice error message showing mismatch
      }
    }
    res[leftKey] = leftVal;
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
