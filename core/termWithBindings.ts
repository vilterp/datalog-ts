import { jsonEq } from "../util/json";
import { filterMap, mapObj } from "../util/util";
import { Bindings, Res, ScopePath, Term, TermWithBindings } from "./types";

export function makeTermWithBindings(
  term: Term,
  bindings: Bindings
): TermWithBindings {
  switch (term.type) {
    case "Record":
      return {
        type: "RecordWithBindings",
        relation: term.relation,
        attrs: mapObj(term.attrs, (_, val) => {
          const binding = Object.keys(bindings).find((b) => {
            return bindings[b] && jsonEq(val, bindings[b]);
          });
          return {
            term: makeTermWithBindings(val, bindings),
            binding: binding,
          };
        }),
      };
    case "Array":
      return {
        type: "ArrayWithBindings",
        items: term.items.map((item) => makeTermWithBindings(item, bindings)),
      };
    case "Negation":
      return {
        type: "NegationWithBindings",
        inner: makeTermWithBindings(term.record, bindings),
      };
    case "Aggregation":
      return {
        type: "AggregationWithBindings",
        aggregation: term.aggregation,
        varNames: term.varNames,
        record: makeTermWithBindings(term.record, bindings),
      };
    default:
      return { type: "Atom", term };
  }
}

export function pathToScopePath(path: Res[]): ScopePath {
  return filterMap(path, (res) =>
    res.trace.type === "RefTrace"
      ? { name: res.trace.refTerm.relation, invokeLoc: res.trace.invokeLoc }
      : null
  );
}
