import { alphabetToNum, numToAlphabet } from "../util/alphabet";
import {
  flatMap,
  flatMapObjToList,
  mapObjToList,
  max,
  maxOfStrings,
  pairsToObj,
  uniq,
} from "../util/util";
import { Conjunct, rec, Relation, Rule, Term, varr } from "./types";

export function gatherVars(rule: Rule): string[] {
  const all = flatMap(rule.body.disjuncts, (disjunct) =>
    flatMap(disjunct.conjuncts, (conj) => gatherVarsTerm(conj))
  );
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

export function varsForRelation(relation: Relation): string[] {
  switch (relation.type) {
    case "Rule":
      return gatherVarsTerm(relation.rule.head);
    case "Table":
      // TODO: get columns for table
      return [];
  }
}

// TODO: something more robust...
export function nextVar(existingVars: string[]) {
  const nums = existingVars.map(alphabetToNum);
  return numToAlphabet(max(nums) + 1);
}

export function conjunctName(conjunct: Conjunct): string {
  switch (conjunct.type) {
    case "Record":
      return conjunct.relation;
    case "Negation":
      return conjunct.record.relation;
    case "Aggregation":
      return conjunct.record.relation;
  }
}

// TODO: move to core utils...?
export function relationColumns(relation: Relation): string[] {
  switch (relation.type) {
    case "Rule":
      return Object.keys(relation.rule.head.attrs);
    case "Table":
      return relation.columns;
  }
}

export function newConjunct(
  name: string,
  rule: Rule,
  relations: Relation[]
): Conjunct {
  const relation = relations.find((r) => r.name === name);
  const columns = relationColumns(relation);
  const pairs: { key: string; val: Term }[] = [];
  const existingVars = gatherVars(rule);
  columns.forEach((col) => {
    const newVar = nextVar(existingVars);
    existingVars.push(newVar);
    pairs.push({
      key: col,
      val: varr(newVar),
    });
  });
  const res = rec(name, pairsToObj(pairs));
  return res;
}
