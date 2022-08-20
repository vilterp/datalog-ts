import { List, Map } from "immutable";
import { mapObj } from "../../util/util";
import { fastPPT } from "../fastPPT";
import { Rec, Value } from "../types";
import { termEq } from "../unify";

export function emptyLazyIndexedCollection() {
  return new LazyIndexedCollection(List(), {});
}

type MutableIndex = { [value: string]: Rec[] };

// bulk initialize
export function lazyIndexedCollectionFromList(records: Rec[]) {
  if (records.length === 0) {
    return emptyLazyIndexedCollection();
  }
  const first = records[0];
  const attrs = Object.keys(first.attrs);
  const mutableIndexes: { [attr: string]: MutableIndex } = {};
  attrs.forEach((attr) => {
    const mutableIndex: MutableIndex = {};
    for (const record of records) {
      const key = fastPPT(record.attrs[attr]);
      const list = mutableIndex[key] || [];
      list.push(record);
      mutableIndex[key] = list;
    }
    mutableIndexes[attr] = mutableIndex;
  });
  const immutableIndexes = mapObj(mutableIndexes, (attr, mutableIndex) =>
    Map(mapObj(mutableIndex, (value, records) => List(records)))
  );
  return new LazyIndexedCollection(List(records), immutableIndexes);
}

type Index = Map<string, List<Rec>>;

export class LazyIndexedCollection {
  readonly allRecords: List<Rec>;
  readonly indexes: { [attr: string]: Index };
  readonly size: number;

  // TODO: exposing this constructor feels weird, since it doesn't
  // enforce that the indexes are consistent with allRecords
  constructor(allRecords: List<Rec>, indexes: { [key: string]: Index }) {
    this.allRecords = allRecords;
    this.indexes = indexes;
    this.size = allRecords.size;
  }

  all(): List<Rec> {
    return this.allRecords;
  }

  insert(item: Rec): LazyIndexedCollection {
    return new LazyIndexedCollection(
      this.allRecords.push(item),
      mapObj(item.attrs, (attr) => {
        // if we haven't seen this attr before, we don't need to backfill
        const prevIndex = this.indexes[attr] || Map();
        return prevIndex.update(fastPPT(item.attrs[attr]), List(), (items) =>
          items.push(item)
        );
      })
    );
  }

  delete(item: Rec): LazyIndexedCollection {
    return new LazyIndexedCollection(
      this.allRecords.filter((rec) => !termEq(item, rec)),
      // TODO: update indexes
      mapObj(item.attrs, (attr) => {
        const prevIndex = this.indexes[attr];
        return prevIndex.update(fastPPT(item.attrs[attr]), (items) =>
          items.filter((indexItem) => !termEq(indexItem, item))
        );
      })
    );
  }

  indexNames(): string[] {
    return Object.keys(this.indexes);
  }

  hasIndex(indexName: string): boolean {
    return !!this.indexes[indexName];
  }

  get(indexName: string, key: Value): List<Rec> {
    return this.indexes[indexName].get(fastPPT(key), List());
  }
}
