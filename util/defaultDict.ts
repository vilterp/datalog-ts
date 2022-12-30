export class DefaultDict<K, V> {
  private items: Map<K, V>;
  private getDefault: () => V;

  constructor(getDefault: () => V) {
    this.items = new Map<K, V>();
    this.getDefault = getDefault;
  }

  has(key: K): boolean {
    return this.items.has(key);
  }

  get(key: K): V {
    let value = this.items.get(key);
    if (value === undefined) {
      value = this.getDefault();
      this.items.set(key, value);
    }
    return value;
  }

  getWithDefault(key: K, def: V): V {
    let value = this.items.get(key);
    if (value === undefined) {
      this.items.set(key, def);
      return def;
    }
    return value;
  }

  set(key: K, value: V) {
    this.items.set(key, value);
    return this;
  }

  update(key: K, updater: (v: V) => V) {
    const value = this.get(key);
    this.set(key, updater(value));
    return this;
  }

  updateWithDefault(key: K, def: V, updater: (v: V) => V) {
    const value = this.getWithDefault(key, def);
    this.set(key, updater(value));
    return this;
  }

  entries(): IterableIterator<[K, V]> {
    return this.items.entries();
  }

  keys(): IterableIterator<K> {
    return this.items.keys();
  }

  values(): IterableIterator<V> {
    return this.items.values();
  }

  size(): number {
    return this.items.size;
  }
}
