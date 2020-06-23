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

export function updateAtIdx<T>(
  arr: T[],
  idx: number,
  update: (t: T) => T
): T[] {
  return arr.map((item, curIdx) => (curIdx === idx ? update(item) : item));
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
