import { List, Map } from "immutable";

export function emptyIndexedCollection<T>(): IndexedCollection<T> {
  return new IndexedCollection(Map(), Map());
}

type Index<T> = {
  getKey: (t: T) => List<string>;
  items: Map<List<string>, Map<T, number>>;
};

export class IndexedCollection<T> {
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
  ): IndexedCollection<T> {
    return new IndexedCollection<T>(
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

  insert(item: T, multiplicity: number): IndexedCollection<T> {
    return new IndexedCollection<T>(
      this.allRecords.set(item, multiplicity),
      this.indexes.map((index) => ({
        ...index,
        items: index.items.update(index.getKey(item), Map(), (items) =>
          items.set(item, multiplicity)
        ),
      }))
    );
  }

  get(indexName: string, key: List<string>): Map<T, number> {
    return this.indexes.get(indexName).items.get(key, Map());
  }
}
