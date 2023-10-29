import { fastPPT } from "../core/fastPPT";
import { Term } from "../core/types";

export class TermTable {
  indexMap: { [key: string]: { term: Term; val: number } } = {};

  get(term: Term): number {
    const printed = fastPPT(term);
    const entry = this.indexMap[printed];
    if (entry !== undefined) {
      return entry.val;
    }
    const index = Object.keys(this.indexMap).length;
    this.indexMap[printed] = { val: index, term: term };
    return index;
  }

  entries(): { term: Term; val: number }[] {
    return Object.values(this.indexMap);
  }
}
