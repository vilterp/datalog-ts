import { List, Map } from "immutable";

export function emptyIndexedCollection<T>(): IndexedCollection<T> {
  return new IndexedCollection(List(), Map());
}

type Index<T> = {
  getKey: (t: T) => string;
  items: Map<string, List<T>>;
};

export class IndexedCollection<T> {
  private readonly allRecords: List<T>;
  private readonly indexes: Map<string, Index<T>>;
  readonly size: number;

  constructor(allRecords: List<T>, indexes: Map<string, Index<T>>) {
    this.allRecords = allRecords;
    this.indexes = indexes;
    this.size = allRecords.size;
  }

  all(): List<T> {
    return this.allRecords;
  }

  createIndex(name: string, getKey: (t: T) => string): IndexedCollection<T> {
    return new IndexedCollection<T>(
      this.allRecords,
      this.indexes.set(name, {
        getKey,
        items: this.allRecords.reduce(
          (accum, item) =>
            accum.update(getKey(item), List(), (l) => l.push(item)),
          Map()
        ),
      })
    );
  }

  insert(item: T): IndexedCollection<T> {
    return new IndexedCollection<T>(
      this.allRecords.push(item),
      this.indexes.map((index) => ({
        ...index,
        items: index.items.update(index.getKey(item), List(), (items) =>
          items.push(item)
        ),
      }))
    );
  }

  get(indexName: string, key: string): List<T> {
    return this.indexes.get(indexName).items.get(key);
  }
}
