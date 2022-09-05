import {
  flatMap,
  flatMapObjToList,
  mapObj,
  mapObjToList,
  uniq,
} from "../util/util";
import { Conjunct, Term } from "./types";

export function gatherVars(conjuncts: Conjunct[]): string[] {
  const all = flatMap(conjuncts, (conj) => gatherVarsTerm(conj));
  return uniq(all);
}

function gatherVarsTerm(term: Term): string[] {
  switch (term.type) {
    case "Var":
      return [term.name];
    case "Array":
      return flatMap(term.items, gatherVarsTerm);
    case "Dict":
      return flatMapObjToList(term.map, (_, subTerm) =>
        gatherVarsTerm(subTerm)
      );
    case "Record":
      return flatMapObjToList(term.attrs, (_, subTerm) =>
        gatherVarsTerm(subTerm)
      );
    // TODO: these probably shouldn't be terms, but alas...
    case "Aggregation":
      return gatherVarsTerm(term.record);
    case "Negation":
      return gatherVarsTerm(term.record);
    default:
      return [];
  }
}

export function pathToVar(term: Term, varName: string): string[] {
  switch (term.type) {
    case "Var":
      return term.name === varName ? [] : null;
    case "Array":
      return (
        term.items.map((t) => pathToVar(t, varName)).find((r) => r !== null) ||
        null
      );
    case "Dict":
      return (
        mapObjToList(term.map, (key, subTerm) => {
          const res = pathToVar(subTerm, varName);
          if (!res) {
            return null;
          }
          return [key, ...res];
        }).find((r) => r !== null) || null
      );
    case "Record":
      return (
        mapObjToList(term.attrs, (key, subTerm) => {
          const res = pathToVar(subTerm, varName);
          if (!res) {
            return null;
          }
          return [key, ...res];
        }).find((r) => r !== null) || null
      );
    // TODO: these probably shouldn't be terms, but alas...
    case "Aggregation":
      return pathToVar(term.record, varName);
    case "Negation":
      return pathToVar(term.record, varName);
    default:
      return [];
  }
}
