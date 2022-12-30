import { DefaultDict } from "../../util/defaultDict";
import { clamp } from "../../util/util";

export function emptyIndexedCollection<T>(
  stringify: (t: T) => string
): IndexedMultiSet<T> {
  return new IndexedMultiSet(
    new DefaultDict<string, ItemAndMult<T>>(() => XXX),
    new DefaultDict<string, Index<T>>(() => XXX),
    stringify
  );
}

type ItemAndMult<T> = { item: T; mult: number };

type Index<T> = {
  getKey: (t: T) => string[];
  items: DefaultDict<string[], Set<string>>;
};

const MULT_RANGE: [number, number] = [-1, 1];

export class IndexedMultiSet<T> {
  private readonly allRecords: DefaultDict<string, ItemAndMult<T>>;
  private readonly indexes: DefaultDict<string, Index<T>>;
  private readonly stringify: (t: T) => string;
  readonly size: number;

  constructor(
    allRecords: DefaultDict<string, ItemAndMult<T>>,
    indexes: DefaultDict<string, Index<T>>,
    stringify: (t: T) => string
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

  createIndex(name: string, getKey: (t: T) => string[]): IndexedMultiSet<T> {
    const indexItems = new DefaultDict<string[], Set<string>>(
      () => new Set<string>()
    );
    for (const [key, val] of this.allRecords.entries()) {
      const keyForItem = getKey(val.item);
      const itemsForKey = indexItems.get(keyForItem);
      itemsForKey.add(keyForItem);
    }
    this.indexes.put(name, { getKey, items: indexItems });
    return this;
  }

  update(item: T, multiplicityDelta: number): IndexedMultiSet<T> {
    // TODO: remove item if newMult is 0?
    const key = this.stringify(item);
    const curMult = (this.allRecords.get(key) || { item, mult: 0 }).mult;
    const newMult = clamp(curMult + multiplicityDelta, MULT_RANGE);
    for (const index of this.indexes.values()) {
      const idxKey = index.getKey(item);
      const items = index.items.get(idxKey) || new Set();
      items.add(key);
    }
    return this;
  }

  getByIndex(indexName: string, key: string[]): Map<T, number> {
    const keySet: Set<string> = this.indexes.get(indexName).items.get(key);
    return new Map(
      keySet.map((key) => {
        const { item, mult } = this.allRecords.get(key);
        return [item, mult];
      })
    );
  }
}
