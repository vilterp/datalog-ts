import { int, rec, str, Term, Rec } from "../types";
import { Expr, Span, Pos } from "./parser";

export function flatten(e: Expr): Term[] {
  return [rec("root_expr", { id: int(0) }), ...recurse(0, e).terms];
}

// TODO: DRY up location being added
function recurse(
  nextID: number,
  e: Expr
): { terms: Term[]; id: number; nextID: number } {
  const nextIDTerm = int(nextID);
  const simple = (term: Term) => ({
    terms: [term],
    id: nextID,
    nextID: nextID + 1,
  });
  switch (e.type) {
    case "Var":
      return simple(
        rec("var", {
          id: nextIDTerm,
          name: str(e.name),
          location: spanToDL(e.span),
        })
      );
    case "StringLit":
      return simple(
        rec("string_lit", {
          id: nextIDTerm,
          val: str(e.val),
          location: spanToDL(e.span),
        })
      );
    case "IntLit":
      return simple(
        rec("int_lit", {
          id: nextIDTerm,
          val: int(e.val),
          location: spanToDL(e.span),
        })
      );
    case "Placeholder":
      return simple(
        rec("placeholder", { id: nextIDTerm, location: spanToDL(e.span) })
      );
    case "FuncCall": {
      const { terms: funcExprTerms, id: funcExprID, nextID: nid1 } = recurse(
        nextID + 1,
        e.func
      );
      const { terms: argExprTerms, id: argExprID, nextID: nid2 } = recurse(
        nid1,
        e.arg
      );
      return {
        terms: [
          rec("func_call", {
            id: int(nextID),
            funcID: int(funcExprID),
            argID: int(argExprID),
            location: spanToDL(e.span),
          }),
          ...funcExprTerms,
          ...argExprTerms,
        ],
        id: nextID,
        nextID: nid2,
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
      const overallTerm = rec("let_expr", {
        id: nextIDTerm,
        varName: str(e.name.ident),
        bindingID: int(bindingID),
        bodyID: int(bodyID),
        location: spanToDL(e.span),
        varLoc: spanToDL(e.name.span),
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
        rec("lambda_param", {
          lambdaID: int(nextID),
          idx: int(idx),
          name: str(param.name.ident),
          ty: str(param.ty.ident),
          location: spanToDL(param.name.span),
        })
      );
      return {
        id: nextID,
        nextID: nid + paramTerms.length,
        terms: [
          rec("lambda", {
            id: nextIDTerm,
            body: int(bodyID),
            retType: str(e.retType.ident),
            numParams: int(e.params.length),
            location: spanToDL(e.span),
          }),
          ...bodyTerms,
          ...paramTerms,
        ],
      };
    }
  }
}

function spanToDL(span: Span): Rec {
  return rec("span", {
    from: posToDL(span.from),
    to: posToDL(span.to),
  });
}

function posToDL(pos: Pos): Rec {
  return rec("pos", { idx: int(pos.offset) });
}
