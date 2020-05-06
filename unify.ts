import { Bindings, rec, Rec, str, Term } from "./types";
import { mapObj } from "./util";
import { ppb, ppt } from "./simpleEvaluate";

export function unify(
  prior: Bindings,
  left: Term,
  right: Term
): Bindings | null {
  const res = doUnify(prior, left, right);
  // console.log("unify", {
  //   prior: ppb(prior),
  //   left: ppt(left),
  //   right: ppt(right),
  //   res: res ? ppb(res) : null,
  // });
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
        if (termEq(priorBinding, right)) {
          return { [left.name]: right };
        }
        return null;
      }
      return { [left.name]: right };
    case "Record": {
      switch (right.type) {
        case "Record":
          let accum = {};
          for (const key of Object.keys(left.attrs)) {
            // TODO: do bindings fold across keys... how would that be ordered...
            const leftVal = left.attrs[key];
            const rightVal = right.attrs[key];
            if (!rightVal) {
              return null;
            }
            const res = unify(prior, leftVal, rightVal);
            if (res === null) {
              return null; // TODO: error message here would be nice saying what we can't unify
            }
            accum = { ...accum, ...res };
          }
          return accum;
        default:
          // TODO: add var case?
          return null;
      }
    }
    default:
      return null;
  }
}

// could use some kind of existing JS deepEq
export function termEq(left: Term, right: Term): boolean {
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
