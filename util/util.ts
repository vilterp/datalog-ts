export function mapObj<T, V>(
  obj: { [k: string]: T },
  f: (k: string, t: T) => V
): { [k: string]: V } {
  const out: { [k: string]: V } = {};
  for (const key of Object.keys(obj)) {
    out[key] = f(key, obj[key]);
  }
  return out;
}

export function filterMap<T, U>(arr: T[], f: (t: T) => U | null): U[] {
  const out: U[] = [];
  for (const item of arr) {
    const res = f(item);
    if (!res) {
      continue;
    }
    out.push(res);
  }
  return out;
}

export function intersperse<T>(sep: T, arr: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1) {
      out.push(sep);
    }
  }
  return out;
}

export function intersperseIdx<T>(sep: (idx: number) => T, arr: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1) {
      out.push(sep(i));
    }
  }
  return out;
}

export function mapObjMaybe<T, V>(
  obj: { [k: string]: T },
  f: (k: string, t: T) => V | undefined | null
): { [k: string]: V } {
  const out: { [k: string]: V } = {};
  for (const key of Object.keys(obj)) {
    const res = f(key, obj[key]);
    if (res) {
      out[key] = res;
    }
  }
  return out;
}

export function mapObjToList<T, V>(
  obj: { [key: string]: T },
  f: (key: string, val: T) => V
): V[] {
  return Object.keys(obj)
    .sort()
    .map((k) => f(k, obj[k]));
}

export function flatMapObjToList<T, V>(
  obj: { [key: string]: T },
  f: (key: string, val: T) => V[]
): V[] {
  const out: V[] = [];
  for (const key of Object.keys(obj).sort()) {
    for (const val of f(key, obj[key])) {
      out.push(val);
    }
  }
  return out;
}

export function flatMap<T, U>(arr: T[], f: (t: T, idx: number) => U[]): U[] {
  const out: U[] = [];
  for (let i = 0; i < arr.length; i++) {
    const input = arr[i];
    for (const output of f(input, i)) {
      out.push(output);
    }
  }
  return out;
}

export function repeat(n: number, str: string): string {
  return repeatArr(n, str).join("");
}

export function repeatArr<T>(n: number, item: T): T[] {
  let out = [];
  for (let i = 0; i < n; i++) {
    out.push(item);
  }
  return out;
}

export function uniq(l: string[]): string[] {
  return uniqBy(l, (x) => x);
}

export function uniqBy<T>(l: T[], f: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of l) {
    const key = f(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function arrayEq<T>(
  a: T[],
  b: T[],
  cmp: (a: T, b: T) => boolean
): boolean {
  return (
    a.length === b.length &&
    a.reduce((accum, el, idx) => accum && cmp(el, b[idx]), true)
  );
}

export function getFirst<T, V>(arr: T[], f: (t: T) => V | null): V | null {
  for (let i = 0; i < arr.length; i++) {
    const res = f(arr[i]);
    if (res !== null) {
      return res;
    }
  }
  return null;
}

export function lastItem<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

export function groupBy<T>(arr: [string, T][]): { [key: string]: T[] } {
  const out: { [key: string]: T[] } = {};
  arr.forEach(([key, item]) => {
    let items = out[key];
    if (!items) {
      items = [];
      out[key] = items;
    }
    items.push(item);
  });
  return out;
}

export function pairsToObj<T>(
  arr: {
    key: string;
    val: T;
  }[]
): { [key: string]: T } {
  const out: { [key: string]: T } = {};
  arr.forEach(({ key, val }) => {
    out[key] = val;
  });
  return out;
}

export function objToPairs<T>(obj: { [key: string]: T }): [string, T][] {
  return mapObjToList(obj, (k, v) => [k, v]);
}

export function clamp(n: number, range: [number, number]): number {
  const [min, max] = range;
  if (n < min) {
    return min;
  }
  if (n > max) {
    return max;
  }
  return n;
}

export function insertAtIdx<T>(arr: T[], idx: number, item: T): T[] {
  return [...arr.slice(0, idx), item, ...arr.slice(idx)];
}

export function removeAtIdx<T>(arr: T[], idx: number): T[] {
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)];
}

export function updateAtIdx<T>(
  arr: T[],
  idx: number,
  update: (t: T) => T
): T[] {
  return arr.map((item, curIdx) => (curIdx === idx ? update(item) : item));
}

export function flatten<T>(results: T[][]): T[] {
  const out: T[] = [];
  results.forEach((resGroup) => {
    resGroup.forEach((res) => {
      out.push(res);
    });
  });
  return out;
}

// assumes that left and right are the same length
export function zip<L, R, O>(
  left: L[],
  right: R[],
  combine: (left: L, right: R) => O
): O[] {
  const output: O[] = [];
  for (let i = 0; i < left.length; i++) {
    output.push(combine(left[i], right[i]));
  }
  return output;
}

export function setUnion<T>(left: Set<T>, right: Set<T>): Set<T> {
  return new Set<T>([...left, ...right]);
}

export function setAdd<T>(set: Set<T>, item: T): Set<T> {
  return new Set<T>([...set, item]);
}

export function filterObj<V>(
  obj: { [k: string]: V },
  f: (k: string, v: V) => boolean
): { [k: string]: V } {
  return filterMapObj(obj, (k, v) => {
    return f(k, v) ? v : null;
  });
}

export function filterMapObj<T, V>(
  obj: { [k: string]: T },
  f: (k: string, t: T) => V | undefined | null
): { [k: string]: V } {
  const out: { [k: string]: V } = {};
  for (const key of Object.keys(obj)) {
    const res = f(key, obj[key]);
    if (res) {
      out[key] = res;
    }
  }
  return out;
}

export function sortBy<T>(arr: T[], attr: (t: T) => string): T[] {
  return arr.sort((a, b) => attr(a).localeCompare(attr(b)));
}

export function permute<T>(items: T[]): T[][] {
  if (items.length === 1) {
    return [items];
  }
  const out: T[][] = [];
  const firstEl = items[0];
  for (let perm of permute(items.slice(1))) {
    for (let i = 0; i < items.length; i++) {
      let outArr: T[] = [];
      outArr = outArr.concat(perm.slice(0, i));
      outArr.push(firstEl);
      outArr = outArr.concat(perm.slice(i));
      out.push(outArr);
    }
  }
  return out;
}

export function combineObjects<T, U>(
  left: { [key: string]: T },
  right: { [key: string]: T },
  combine: (key: string, left: T, right: T) => U
): { [key: string]: U } {
  const out: { [key: string]: U } = {};
  for (let leftKey in left) {
    const rightItem = right[leftKey];
    if (rightItem) {
      const leftItem = left[leftKey];
      out[leftKey] = combine(leftKey, leftItem, rightItem);
    }
  }
  return out;
}

export function setEq<T>(left: Set<T>, right: Set<T>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const item of left) {
    if (!right.has(item)) {
      return false;
    }
  }
  return true;
}

export function updateList<T>(
  list: T[],
  predicate: (t: T) => boolean,
  update: (t: T) => T
) {
  return list.map((item) => (predicate(item) ? update(item) : item));
}

export function sleep(durationMS: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), durationMS);
  });
}

export function partition<T>(arr: T[], pred: (t: T) => boolean): [T[], T[]] {
  const trues: T[] = [];
  const falses: T[] = [];
  for (const item of arr) {
    if (pred(item)) {
      trues.push(item);
    } else {
      falses.push(item);
    }
  }
  return [trues, falses];
}

export function stringToArray(str: string): string[] {
  return str.split("");
}

export function range(length: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    out.push(i);
  }
  return out;
}

export function pushAll<T>(arr: T[], items: T[]) {
  items.forEach((item) => {
    arr.push(item);
  });
}
