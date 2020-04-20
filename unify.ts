import { Bindings, Term } from "./types";

export function unify(
  prior: Bindings,
  left: Term,
  right: Term
): Bindings | null {
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
          for (const key in Object.keys(left.attrs)) {
            // TODO: do bindings fold across keys... how would that be ordered...
            const leftVal = left.attrs[key];
            const rightVal = right.attrs[key];
            if (!rightVal) {
              return null;
            }
            const res = unify(prior, leftVal, rightVal);
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
function termEq(left: Term, right: Term): boolean {
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
          for (const key in Object.keys(left.attrs)) {
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
