import { AbstractInterpreter } from "../../core/abstractInterpreter";

const REQUIRED_TABLES = [
  "ast.keyword",
  "ast.ident",
  "scope.Defn",
  "scope.Var",
  "scope.Parent",
  "scope.Placeholder",
];

export function ensureRequiredTables(
  interp: AbstractInterpreter
): AbstractInterpreter {
  const existing = new Set([
    ...interp.getRules().map((r) => r.head.relation),
    ...interp.getTables(),
  ]);
  let finalInterp = interp;
  REQUIRED_TABLES.forEach((requiredTable) => {
    if (!existing.has(requiredTable)) {
      console.log("adding", requiredTable);
      finalInterp = finalInterp.evalStmt({
        type: "TableDecl",
        name: requiredTable,
      })[1];
    }
  });
  return finalInterp;
}
