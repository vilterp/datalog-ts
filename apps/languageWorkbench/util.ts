import { AbstractInterpreter } from "../../core/abstractInterpreter";

export function ensureHighlightSegmentTable(
  interp: AbstractInterpreter
): AbstractInterpreter {
  if (interp.getRules().some((r) => r.head.relation === "hl.Segment")) {
    return interp;
  }
  return interp.evalStmt({ type: "TableDecl", name: "hl.Segment" })[1];
}
