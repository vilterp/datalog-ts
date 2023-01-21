import { BUILTINS } from "./builtins";
import { Bindings, Rec, Res } from "./types";
import { substitute, unify } from "./unify";

export function evalBuiltin(term: Rec, scope: Bindings): Res[] {
  const builtin = BUILTINS[term.relation];
  const substituted = substitute(term, scope) as Rec;
  const records = builtin.fun(substituted);
  // console.log("evalBuiltin", {
  //   substituted: ppt(substituted),
  //   res: records.map(ppt),
  // });
  const results = records.map(
    (rec): Res => ({
      term: rec,
      bindings: unify(scope, rec, term),
      trace: { type: "BaseFactTrace" }, // TODO: BuiltinTrace?
    })
  );
  // console.log("evalBuiltin", "results", results);
  return results;
}
