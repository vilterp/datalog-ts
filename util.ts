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

export function flatMap<T, U>(arr: T[], f: (t: T) => U[]): U[] {
  const out: U[] = [];
  for (const input of arr) {
    for (const output of f(input)) {
      out.push(output);
    }
  }
  return out;
}

export function repeat(n: number, str: string): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += str;
  }
  return out;
}

export function uniq(l: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of l) {
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    out.push(line);
  }
  return out;
}
