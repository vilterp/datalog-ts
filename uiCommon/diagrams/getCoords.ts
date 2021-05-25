import { Diag, Point } from "./types";
import { dimensions } from "./render";

export function getCoords<T>(d: Diag<T>, tag: T): Point | null {
  return recurse(d, tag, { x: 0, y: 0 });
}

function recurse<T>(d: Diag<T>, tag: T, origin: Point): Point | null {
  switch (d.type) {
    case "TAG":
      // TODO: better approach to deep equality
      if (JSON.stringify(d.tag) === JSON.stringify(tag)) {
        return origin;
      }
      return recurse(d.diag, tag, origin);
    case "ABS_POS":
      return recurse(d.diag, tag, {
        x: origin.x + d.point.x,
        y: origin.y + d.point.y,
      });
    case "HORIZ_LAYOUT":
      // TODO: dedup
      let x = 0;
      for (let i = 0; i < d.children.length; i++) {
        const child = d.children[i];
        const res = recurse(child, tag, { x: origin.x + x, y: origin.y });
        if (res !== null) {
          return res;
        }
        const dims = dimensions(child);
        x += dims.width;
      }
      return null;
    case "VERT_LAYOUT":
      // TODO: dedup
      let y = 0;
      for (let i = 0; i < d.children.length; i++) {
        const child = d.children[i];
        const res = recurse(child, tag, { x: origin.x, y: origin.y + y });
        if (res !== null) {
          return res;
        }
        const dims = dimensions(child);
        y += dims.height;
      }
      return null;
    case "Z_LAYOUT":
      return firstMatch(d.children, (c) => recurse(c, tag, origin));
    default:
      return null;
  }
}

export function firstMatch<T, S>(arr: T[], f: (t: T) => S | null): S | null {
  for (let i = 0; i < arr.length; i++) {
    const res = f(arr[i]);
    if (res === null) {
      continue;
    }
    return res;
  }
  return null;
}
