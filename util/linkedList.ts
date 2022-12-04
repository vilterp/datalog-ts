export type LinkedList<T> = { head: T; tail: LinkedList<T> } | null;

export function* allItems<T>(list: LinkedList<T>): Generator<T> {
  let cur = list;
  while (cur != null) {
    yield cur.head;
    cur = cur.tail;
  }
}
