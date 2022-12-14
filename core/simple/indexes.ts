import { List } from "immutable";
import { DefaultDict } from "../../util/defaultDict";
import { baseFactTrace, Bindings, Rec, Res } from "../types";
import { unify } from "../unify";
import { LazyIndexedCollection } from "./lazyIndexedCollection";

export function getForScope(
  collection: LazyIndexedCollection,
  scope: Bindings,
  original: Rec
) {
  const out: Res[] = [];
  const records = getFromIndex(collection, scope, original);
  // console.log({
  //   original: ppt(original),
  //   scope: ppb(scope),
  //   res: records.toArray().map(ppt),
  // });
  for (const rec of records.toArray()) {
    const unifyRes = unify(scope, original, rec);
    // console.log("scan", {
    //   scope: ppb(scope),
    //   term: ppt(term),
    //   rec: ppt(rec),
    //   unifyRes: unifyRes ? ppb(unifyRes) : null,
    // });
    if (unifyRes === null) {
      continue;
    }
    out.push({
      term: rec,
      bindings: unifyRes,
      trace: {
        type: "MatchTrace",
        match: original,
        fact: { term: rec, trace: baseFactTrace, bindings: {} },
      },
    });
  }
  return out;
}

const emptyIndexStats = () => ({
  sequentialScans: 0,
  indexHits: 0,
  detailedIndexStats: new DefaultDict<number>(() => 0),
  detailedSequentialScans: new DefaultDict<number>(() => 0),
});

let indexStats = emptyIndexStats();

export function clearIndexStats() {
  indexStats = emptyIndexStats();
}

export function getIndexStats() {
  return indexStats;
}

function getFromIndex(
  collection: LazyIndexedCollection,
  scope: Bindings,
  rec: Rec
): List<Rec> {
  if (!scope) {
    return null;
  }
  for (const attr in rec.attrs) {
    const val = rec.attrs[attr];
    if (!val) {
      continue;
    }
    if (val.type === "Var") {
      const scopeVal = scope[val.name];
      if (!scopeVal) {
        continue;
      }
      if (scopeVal.type === "Var" || scopeVal.type === "Record") {
        continue;
      }
      if (!collection.hasIndex(attr)) {
        continue;
      }
      // console.log("chose index from scope", {
      //   attr,
      //   index: collection.indexes[attr]
      //     .mapEntries(([k, v]) => [k, v.toArray().map(ppt)])
      //     .toObject(),
      //   val: ppt(scopeVal),
      //   res: collection.get(attr, scopeVal).map(ppt).toArray(),
      // });
      indexStats.indexHits++;
      indexStats.detailedIndexStats.update(attr, (n) => n + 1);
      return collection.get(attr, scopeVal);
    }
    if (val.type === "Record") {
      continue;
    }
    if (!collection.hasIndex(attr)) {
      continue;
    }
    // console.log("chose index from attr", attr);
    indexStats.indexHits++;
    return collection.get(attr, val);
  }
  indexStats.sequentialScans++;
  indexStats.detailedSequentialScans.update(rec.relation, (n) => n + 1);
  return collection.all();
}
