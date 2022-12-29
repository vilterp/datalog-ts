import { List, Map, Set } from "immutable";
import { clamp } from "../../util/util";

export function emptyIndexedCollection<T>(
  stringify: (t: T) => string
): IndexedMultiSet<T> {
  return new IndexedMultiSet(Map(), Map(), stringify);
}

type ItemAndMult<T> = { item: T; mult: number };

type Index<T> = {
  getKey: (t: T) => List<string>;
  items: Map<List<string>, Set<string>>;
};

const MULT_RANGE: [number, number] = [-1, 1];

export class IndexedMultiSet<T> {
  private readonly allRecords: Map<string, ItemAndMult<T>>;
  private readonly indexes: Map<string, Index<T>>;
  private readonly stringify: (t: T) => string;
  readonly size: number;

  constructor(
    allRecords: Map<string, ItemAndMult<T>>,
    indexes: Map<string, Index<T>>,
    stringify: (t: T) => string
  ) {
    this.allRecords = allRecords;
    this.indexes = indexes;
    this.size = allRecords.size;
    this.stringify = stringify;
  }

  all(): Map<T, number> {
    return this.allRecords.mapEntries(([key, value]) => [
      value.item,
      value.mult,
    ]);
  }

  indexNames(): string[] {
    return this.indexes.keySeq().toArray();
  }

  toJSON(): object {
    return this.indexes.toJSON();
  }

  createIndex(
    name: string,
    getKey: (t: T) => List<string>
  ): IndexedMultiSet<T> {
    return new IndexedMultiSet<T>(
      this.allRecords,
      this.indexes.set(name, {
        getKey,
        items: this.allRecords.reduce(
          (accum, val, key) =>
            accum.update(getKey(val.item), Set(), (l) => l.add(key)),
          Map()
        ),
      }),
      this.stringify
    );
  }

  update(item: T, multiplicityDelta: number): IndexedMultiSet<T> {
    // TODO: remove item if newMult is 0?
    const key = this.stringify(item);
    const curMult = this.allRecords.get(key, { item, mult: 0 }).mult;
    const newMult = clamp(curMult + multiplicityDelta, MULT_RANGE);
    return new IndexedMultiSet<T>(
      this.allRecords.set(key, { mult: newMult, item }),
      this.indexes.map((index) => ({
        ...index,
        items: index.items.update(index.getKey(item), Set(), (items) =>
          items.add(key)
        ),
      })),
      this.stringify
    );
  }

  getByIndex(indexName: string, key: List<string>): Map<T, number> {
    const keySet: Set<string> = this.indexes
      .get(indexName)
      .items.get(key, Set());
    return Map(
      keySet.map((key) => {
        const { item, mult } = this.allRecords.get(key);
        return [item, mult];
      })
    );
  }
}
