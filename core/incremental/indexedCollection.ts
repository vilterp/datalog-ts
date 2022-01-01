import { Json } from "../../util/json";

export function emptyIndexedCollection<T>(): IndexedCollection<T> {
  return new IndexedCollection([], new Map());
}

type Key = string;

type Index<T> = {
  getKey: (t: T) => Key;
  items: Map<Key, T[]>;
};

export class IndexedCollection<T> {
  private readonly allRecords: T[];
  private readonly indexes: Map<string, Index<T>>;
  readonly size: number;

  constructor(allRecords: T[], indexes: Map<string, Index<T>>) {
    this.allRecords = allRecords;
    this.indexes = indexes;
    this.size = allRecords.length;
  }

  all(): T[] {
    return this.allRecords;
  }

  indexNames(): string[] {
    return [...this.indexes.keys()];
  }

  toJSON(): Json {
    // TODO
    return {};
  }

  createIndex(name: string, getKey: (t: T) => Key) {
    const index: Index<T> = {
      getKey,
      items: new Map<Key, T[]>(),
    };
    this.allRecords.forEach((item) => {
      this.insertIntoIndex(index, item);
    });
    this.indexes.set(name, index);
  }

  insert(item: T) {
    this.allRecords.push(item);
    this.indexes.forEach((index) => {
      this.insertIntoIndex(index, item);
    });
  }

  private insertIntoIndex(index: Index<T>, item: T) {
    const key = index.getKey(item);
    let itemsForKey: T[] = index.items.get(key);
    if (!itemsForKey) {
      itemsForKey = [];
      index.items.set(key, itemsForKey);
    }
    itemsForKey.push(item);
  }

  get(indexName: string, key: Key): T[] {
    return this.indexes.get(indexName).items.get(key) || [];
  }
}
