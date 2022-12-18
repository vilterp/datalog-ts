export class DefaultDict<V> {
  private items: Map<string, V>;
  private getDefault: () => V;

  constructor(getDefault: () => V) {
    this.items = new Map<string, V>();
    this.getDefault = getDefault;
  }

  has(key: string): boolean {
    return this.items.has(key);
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

  toJSON(): { [key: string]: V } {
    const out: { [key: string]: V } = {};
    this.items.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
}
