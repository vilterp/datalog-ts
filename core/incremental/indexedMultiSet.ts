import { List, Map } from "immutable";

export function emptyIndexedCollection<T>(): IndexedMultiSet<T> {
  return new IndexedMultiSet(Map(), Map());
}

type Index<T> = {
  getKey: (t: T) => List<string>;
  items: Map<List<string>, Map<T, number>>;
};

export class IndexedMultiSet<T> {
  private readonly allRecords: Map<T, number>;
  private readonly indexes: Map<string, Index<T>>;
  readonly size: number;

  constructor(allRecords: Map<T, number>, indexes: Map<string, Index<T>>) {
    this.allRecords = allRecords;
    this.indexes = indexes;
    this.size = allRecords.size;
  }

  all(): Map<T, number> {
    return this.allRecords;
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
          (accum, multiplicity, item) =>
            accum.update(getKey(item), Map(), (l) => l.set(item, multiplicity)),
          Map()
        ),
      })
    );
  }

  update(item: T, multiplicityDelta: number): IndexedMultiSet<T> {
    // TODO: remove item if newMult is 0?
    const curMult = this.allRecords.get(item, 0);
    const newMult = curMult + multiplicityDelta;
    return new IndexedMultiSet<T>(
      this.allRecords.set(item, newMult),
      this.indexes.map((index) => ({
        ...index,
        items: index.items.update(index.getKey(item), Map(), (items) =>
          items.set(item, newMult)
        ),
      }))
    );
  }

  getByIndex(indexName: string, key: List<string>): Map<T, number> {
    return this.indexes.get(indexName).items.get(key, Map());
  }
}
