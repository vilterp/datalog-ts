import { DefaultDict } from "../../util/defaultDict";

export function emptyIndexedMultiset<T>(
  stringify: (t: T) => Key
): IndexedMultiSet<T> {
  return new IndexedMultiSet(
    new DefaultDict<Key, ItemAndMult<T>>(() => {
      throw new Error("bloop");
    }),
    new DefaultDict<string, Index<T>>(() => {
      throw new Error("bloop");
    }),
    stringify
  );
}

type ItemAndMult<T> = { item: T; mult: number };

export type Key = string;

type Index<T> = {
  getKey: (t: T) => Key;
  items: DefaultDict<Key, Set<Key>>;
};

export class IndexedMultiSet<T> {
  private readonly allRecords: DefaultDict<Key, ItemAndMult<T>>;
  private readonly indexes: DefaultDict<string, Index<T>>;
  private readonly stringify: (t: T) => Key;
  readonly size: number;

  constructor(
    allRecords: DefaultDict<Key, ItemAndMult<T>>,
    indexes: DefaultDict<string, Index<T>>,
    stringify: (t: T) => Key
  ) {
    this.allRecords = allRecords;
    this.indexes = indexes;
    this.size = allRecords.size();
    this.stringify = stringify;
  }

  all(): IterableIterator<ItemAndMult<T>> {
    return this.allRecords.values();
  }

  indexNames(): string[] {
    return [...this.indexes.keys()];
  }

  createIndex(name: string, getKey: (t: T) => Key): IndexedMultiSet<T> {
    const indexItems = new DefaultDict<Key, Set<Key>>(() => new Set<Key>());
    for (const [key, val] of this.allRecords.entries()) {
      const keyForItem = getKey(val.item);
      const itemsForKey = indexItems.get(keyForItem);
      itemsForKey.add(keyForItem);
    }
    this.indexes.put(name, { getKey, items: indexItems });
    return this;
  }

  get(item: T): number {
    const entry = this.allRecords.get(this.stringify(item));
    return entry ? entry.mult : 0;
  }

  has(item: T): boolean {
    return this.allRecords.has(this.stringify(item));
  }

  update(item: T, multiplicityDelta: number): IndexedMultiSet<T> {
    // TODO: remove item if newMult is 0?
    const key = this.stringify(item);
    const curMult = this.allRecords.getWithDefault(key, { item, mult: 0 }).mult;
    const newMult = curMult + multiplicityDelta;
    this.allRecords.put(key, { item, mult: newMult });
    for (const index of this.indexes.values()) {
      const idxKey = index.getKey(item);
      const items = index.items.get(idxKey);
      items.add(key);
    }
    return this;
  }

  getByIndex(indexName: string, key: Key): ItemAndMult<T>[] {
    const keySet: Set<Key> = this.indexes.get(indexName).items.get(key);
    const out: ItemAndMult<T>[] = [];
    for (const key of keySet) {
      out.push(this.allRecords.get(key));
    }
    return out;
  }
}
