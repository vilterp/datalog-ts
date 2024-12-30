import { List, Map, Seq, Set } from "immutable";

export type Key = string; // ???

export function emptyIndexedMultiset<T>(
  stringify: (t: T) => string
): IndexedMultiSet<T> {
  return new IndexedMultiSet(Map(), Map(), stringify);
}

type ItemAndMult<T> = { item: T; mult: number };

type Index<T> = {
  getKey: (t: T) => Key;
  items: Map<Key, Set<string>>;
};

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

  all(): Seq.Indexed<ItemAndMult<T>> {
    return this.allRecords
      .entrySeq()
      .map(([key, value]) => ({ item: value.item, mult: value.mult }));
  }

  indexNames(): string[] {
    return this.indexes.keySeq().toArray();
  }

  toJSON(): object {
    return this.indexes.toJSON();
  }

  createIndex(name: string, getKey: (t: T) => Key): IndexedMultiSet<T> {
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
    const newMult = curMult + multiplicityDelta;
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

  get(item: T): number {
    const entry = this.allRecords.get(this.stringify(item));
    return entry ? entry.mult : 0;
  }

  has(item: T): boolean {
    return this.allRecords.has(this.stringify(item));
  }

  getByIndex(indexName: string, key: Key): Set<ItemAndMult<T>> {
    const keySet: Set<string> = this.indexes
      .get(indexName)
      .items.get(key, Set());
    return keySet.map((key) => this.allRecords.get(key));
  }
}
