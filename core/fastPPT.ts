import { mapObjToList, mapObjToListUnordered } from "../util/util";
import { Bindings, Res, Term } from "./types";

export function fastPPR(res: Res) {
  return `${res.term ? fastPPT(res.term) : null} ${fastPPB(res.bindings)}`;
}

export function fastPPB(bindings: Bindings) {
  return `{${mapObjToList(bindings, (k, v) => `${k}: ${fastPPT(v)}`).join(
    ", "
  )}}`;
}

type Stats = {
  cacheHits: number;
  total: number;
};

function getEmptyStats(): Stats {
  return {
    cacheHits: 0,
    total: 0,
  };
}

let stats = getEmptyStats();

export function getAndClearPPTStats(): Stats {
  const ret = stats;
  stats = getEmptyStats();
  return ret;
}

export function fastPPT(term: Term): string {
  stats.total++;
  // @ts-ignore
  if (term.__cachedKey) {
    stats.cacheHits++;
    // @ts-ignore
    return term.__cachedKey;
  }
  const key = fastPPTRaw(term);
  // @ts-ignore
  term.__cachedKey = key;
  return key;
}

function fastPPTRaw(term: Term): string {
  switch (term.type) {
    case "Array":
      return `[${term.items.map(fastPPT).join(", ")}]`;
    case "Bool":
      return term.val.toString();
    case "StringLit":
      return `"${term.val}"`;
    case "IntLit":
      return term.val.toString();
    case "Var":
      return term.name;
    case "Record":
      return `${term.relation}{${mapObjToListUnordered(
        term.attrs,
        (k, v) => `${k}: ${fastPPT(v)}`
      ).join(", ")}}`;
    case "Dict":
      return `${mapObjToListUnordered(
        term.map,
        (key, value) => `${key}: ${fastPPT(value)}`
      ).join(", ")}}`;
  }
}
