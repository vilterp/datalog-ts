import { BUILTINS } from "./builtins";
import { Bindings, Rec, Res } from "./types";
import { substitute, unify } from "./unify";

export function evalBuiltin(term: Rec, scope: Bindings) {
  const builtin = BUILTINS[term.relation];
  const substituted = substitute(term, scope) as Rec;
  const records = builtin(substituted);
  // console.log({ substituted: ppt(substituted), res: res.map(ppr) });
  const results = records.map(
    (rec): Res => ({
      term: rec,
      bindings: unify(scope, rec, term),
      trace: { type: "BaseFactTrace" }, // TODO: BuiltinTrace?
    })
  );
  // console.log(results.map(ppr));
  return results;
}
