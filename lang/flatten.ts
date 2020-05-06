import { rec, str, Term } from "../types";
import { Expr } from "./parser";

export function flatten(e: Expr): Term[] {
  return recurse(0, e).terms;
}

// TODO: positions
function recurse(
  nextID: number,
  e: Expr
): { terms: Term[]; id: number; nextID: number } {
  const nextIDTerm = str(`${nextID}`);
  const simple = (term: Term) => ({
    terms: [term],
    id: nextID,
    nextID: nextID + 1,
  });
  switch (e.type) {
    case "Var":
      return simple(rec("var", { id: nextIDTerm, name: str(e.name.ident) }));
    case "StringLit":
      return simple(rec("stringLit", { id: nextIDTerm, val: str(e.val) }));
    case "IntLit":
      return simple(
        rec("intLit", { id: nextIDTerm, val: str(e.val.toString()) })
      );
    case "Placeholder":
      return simple(rec("placeholder", { id: nextIDTerm }));
    case "FuncCall": {
      // TODO: args (maybe just do curried?
      const { nid, terms: argExprTerms, argIDs } = e.args.reduce(
        (accum, arg) => {
          const { id: argID, nextID: newNID, terms: newArgTerms } = recurse(
            accum.nid,
            arg
          );
          return {
            nid: newNID,
            terms: [...accum.terms, ...newArgTerms],
            argIDs: [...accum.argIDs, argID],
          };
        },
        { nid: nextID + 1, terms: [], argIDs: [] }
      );
      const argTerms = argIDs.map((argID, idx) =>
        rec("funcArg", {
          id: str(`${idx + nid}`),
          idx: str(idx.toString()),
          exprID: str(argID.toString()),
        })
      );
      return {
        terms: [
          rec("funcCall", {
            id: nextIDTerm,
            name: str(e.name.ident),
            numArgs: str(e.args.length.toString()),
          }),
          ...argExprTerms,
          ...argTerms,
        ],
        id: nextID,
        nextID: nid + argTerms.length,
      };
    }
    case "Let": {
      const { id: bindingID, terms: bindingsTerms, nextID: nid1 } = recurse(
        nextID + 1,
        e.binding
      );
      const { id: bodyID, terms: bodyTerms, nextID: nid2 } = recurse(
        nid1,
        e.body
      );
      const overallTerm = rec("letExpr", {
        id: nextIDTerm,
        varName: str(e.name.ident),
        binding: str(`${bindingID}`),
        body: str(`${bodyID}`),
      });
      return {
        terms: [overallTerm, ...bindingsTerms, ...bodyTerms],
        id: nextID,
        nextID: nid2,
      };
    }
    case "Lambda": {
      const { id: bodyID, nextID: nid, terms: bodyTerms } = recurse(
        nextID + 1,
        e.body
      );
      const paramTerms = e.params.map((param, idx) =>
        rec("lambdaParam", {
          id: str(`${nid + idx}`),
          idx: str(idx.toString()),
          name: str(param.name.ident),
          ty: str(param.ty.ident),
        })
      );
      return {
        id: nextID,
        nextID: nid + paramTerms.length,
        terms: [
          rec("lambda", {
            id: nextIDTerm,
            body: str(`${bodyID}`),
            retType: str(e.retType.ident),
            numParams: str(e.params.length.toString()),
          }),
          ...bodyTerms,
          ...paramTerms,
        ],
      };
    }
  }
}
