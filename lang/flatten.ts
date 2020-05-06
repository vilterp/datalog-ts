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
      const { nid, terms: argTerms, argIDs } = e.args.reduce(
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
      return {
        terms: [
          ...argTerms,
          // TODO: work in arg ids
          rec("funcCall", {
            id: nextIDTerm,
            name: str(e.name.ident),
            argIDs: str(argIDs.join(", ")),
          }),
        ],
        id: nextID,
        nextID: nid,
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
      const overallTerm = [
        rec("letExpr", {
          id: nextIDTerm,
          varName: str(e.name.ident),
          binding: str(`${bindingID}`),
          body: str(`${bodyID}`),
        }),
      ];
      return {
        terms: [...bindingsTerms, ...bodyTerms, ...overallTerm],
        id: nextID,
        nextID: nid2,
      };
    }
    case "Lambda": {
      const { id: bodyID, nextID: nid, terms: bodyTerms } = recurse(
        nextID + 1,
        e.body
      );
      return {
        id: nextID,
        nextID: nid,
        terms: [
          ...bodyTerms,
          rec("lambda", {
            id: nextIDTerm,
            body: str(`${bodyID}`),
            params: str(
              e.params.map((p) => `${p.name.ident}: ${p.ty.ident}`).join(", ")
            ),
          }),
        ],
      };
    }
  }
}
