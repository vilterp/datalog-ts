import { Rule, Statement } from "../../../core/types";
import { DL2Decl, DL2File } from "./parser";

export function desugar(file: DL2File): Statement[] {
  return file.decl.map((decl) => ({ type: "Rule", rule: declToRule(decl) }));
}

function declToRule(decl: DL2Decl): Rule {
  switch (decl.relExpr.type) {
    case "PointFreeAbstraction":
      return XXXX;
    case "PointwiseAbstraction":
      return XXX;
    case "RelationLiteral":
      return XXX;
    case "Ident":
      throw new Error("TODO");
  }
}
