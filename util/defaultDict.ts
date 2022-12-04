export class DefaultDict<V> {
  items: Map<string, V>;
  getDefault: () => V;

  constructor(getDefault: () => V) {
    this.items = new Map<string, V>();
    this.getDefault = getDefault;
  }

  get(key: string): V {
    const value = this.items.get(key);
    if (value !== undefined) {
      return value;
    }
    return this.getDefault();
  }

  put(key: string, value: V) {
    this.items.set(key, value);
  }
}
