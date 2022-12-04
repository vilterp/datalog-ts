export class DefaultDict<V> {
  items: Map<string, V>;
  getDefault: () => V;

  constructor(getDefault: () => V) {
    this.items = new Map<string, V>();
    this.getDefault = getDefault;
  }

  get(key: string): V {
    let value = this.items.get(key);
    if (value === undefined) {
      value = this.getDefault();
      this.items.set(key, value);
    }
    return value;
  }

  put(key: string, value: V) {
    this.items.set(key, value);
  }
}
