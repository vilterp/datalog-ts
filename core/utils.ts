import { flatMap, flatMapObjToList } from "../util/util";
import { Term } from "./types";

export function gatherVarsInTerm(term: Term): string[] {
  switch (term.type) {
    case "Var":
      return [term.name];
    case "Array":
      return flatMap(term.items, gatherVarsInTerm);
    case "Dict":
      return flatMapObjToList(term.map, (_, subTerm) =>
        gatherVarsInTerm(subTerm)
      );
    case "Record":
      return flatMapObjToList(term.attrs, (_, subTerm) =>
        gatherVarsInTerm(subTerm)
      );
    // TODO: these probably shouldn't be terms, but alas...
    case "Aggregation":
      return gatherVarsInTerm(term.record);
    case "Negation":
      return gatherVarsInTerm(term.record);
    default:
      return [];
  }
}
