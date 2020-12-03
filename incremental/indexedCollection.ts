import { appendToKey } from "../util";

type Index<T> = {
  getKey: (t: T) => string[];
  items: { [key: string]: T[] };
};

export class IndexedCollection<T> {
  private allRecords: T[];
  private readonly indexes: { [name: string]: Index<T> };

  constructor() {
    this.allRecords = [];
    this.indexes = {};
  }

  size() {
    return this.allRecords.length;
  }

  all(): T[] {
    return this.allRecords;
  }

  indexNames(): string[] {
    return Object.keys(this.indexes);
  }

  toJSON(): object {
    return this.indexes;
  }

  createIndex(name: string, getKey: (t: T) => string[]) {
    const items = {};
    for (let item of this.allRecords) {
      // TODO: better join strategy? extract?
      appendToKey(items, getKey(item).join("-"), item);
    }
    this.indexes[name] = {
      getKey,
      items,
    };
  }

  insert(item: T) {
    this.allRecords.push(item);
    for (let indexName in this.indexes) {
      const index = this.indexes[indexName];
      appendToKey(index.items, index.getKey(item).join("-"), item);
    }
  }

  get(indexName: string, key: string[]): T[] {
    return this.indexes[indexName].items[key.join("-")] || [];
  }

  clear() {
    this.allRecords = [];
    for (let indexName in this.indexes) {
      const index = this.indexes[indexName];
      index.items = {};
    }
  }
}
