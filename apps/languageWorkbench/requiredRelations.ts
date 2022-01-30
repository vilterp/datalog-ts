import { AbstractInterpreter } from "../../core/abstractInterpreter";

// this is the closest we've come thus far to specifying an API...
const REQUIRED_RELATIONS = [
  "hl.mapping",
  "scope.Scope",
  "scope.Defn",
  "scope.Var",
  "scope.Parent",
  "scope.Placeholder",
];

export function ensureRequiredRelations(
  interp: AbstractInterpreter
): AbstractInterpreter {
  const existing = new Set([
    ...interp.getRules().map((r) => r.head.relation),
    ...interp.getTables(),
  ]);
  let finalInterp = interp;
  REQUIRED_RELATIONS.forEach((requiredTable) => {
    if (!existing.has(requiredTable)) {
      finalInterp = finalInterp.evalStmt({
        type: "TableDecl",
        name: requiredTable,
      })[1];
    }
  });
  return finalInterp;
}
