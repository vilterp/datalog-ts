import { Bindings, rec, Rec, str, Term } from "./types";
import { mapObj } from "./util";

export function unify(
  prior: Bindings,
  left: Term,
  right: Term
): Bindings | null {
  const res = doUnify(prior, left, right);
  return res;
}

function doUnify(prior: Bindings, left: Term, right: Term): Bindings | null {
  switch (left.type) {
    case "StringLit":
      switch (right.type) {
        case "StringLit":
          return left.val === right.val ? {} : null;
        default:
          // TODO: add var case?
          return null;
      }
    case "Var":
      // TODO: what about prior bindings?
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
  }
}

// could use some kind of existing JS deepEq
export function termEq(left: Term, right: Term): boolean {
  switch (left.type) {
    case "StringLit":
      switch (right.type) {
        case "StringLit":
          return left.val === right.val;
        default:
          return false;
      }
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
  for (const key of Object.keys(left)) {
    const leftVal = left[key];
    const rightVal = right[key];
    if (rightVal) {
      if (!termEq(rightVal, leftVal)) {
        return null; // TODO: nice error message showing mismatch
      }
    }
    res[key] = leftVal;
  }
  const onlyInRight = Object.keys(right).filter((key) => !left[key]);
  for (const key of onlyInRight) {
    res[key] = right[key];
  }
  // TODO: put in right vals
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
      return bindings[term.name]; // TODO: handling missing. lol
    default:
      return term;
  }
}

const tests = [
  {
    name: "unifyVars",
    test: () => {
      const res = unifyVars(
        { A: str("Pete"), B: str("Paul") },
        { B: str("Paul"), C: str("Peter") }
      );
      console.log(res);
    },
  },
];

tests.forEach((t) => {
  console.log("============");
  console.log(t.name);
  t.test();
});
