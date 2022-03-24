import { List, Map } from "immutable";
import { mapObj } from "../../util/util";
import { fastPPT } from "../fastPPT";
import { Rec, Term } from "../types";

export function emptyLazyIndexedCollection() {
  return new LazyIndexedCollection(List(), {});
}

type Index = Map<string, List<Rec>>;

export class LazyIndexedCollection {
  private readonly allRecords: List<Rec>;
  private readonly indexes: { [attr: string]: Index };
  readonly size: number;

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

  indexNames(): string[] {
    return Object.keys(this.indexes);
  }

  hasIndex(indexName: string): boolean {
    return !!this.indexes[indexName];
  }

  get(indexName: string, key: Term): List<Rec> {
    return this.indexes[indexName].get(fastPPT(key), List());
  }
}
