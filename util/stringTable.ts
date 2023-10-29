export class StringTable {
  indexMap: { [key: string]: number } = {};

  // return true if added
  get(key: string): number {
    const val = this.indexMap[key];
    if (val !== undefined) {
      return val;
    }
    const index = Object.keys(this.indexMap).length;
    this.indexMap[key] = index;
    return index;
  }
}
