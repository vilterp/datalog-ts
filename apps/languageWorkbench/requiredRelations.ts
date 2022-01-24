import { AbstractInterpreter } from "../../core/abstractInterpreter";

// this is the closest we've come thus far to specifying an API...
const REQUIRED_RELATIONS = [
  "ast.keyword",
  "ast.ident",
  "ast.string",
  "ast.int",
  "ast.bool",
  "astInternal.firstChild",
  "astInternal.lastChild",
  "astInternal.next",
  "scope.Scope",
  "scope.Defn",
  "scope.Var",
  "scope.Parent",
  "scope.Placeholder",
  "ide.Cursor",
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
