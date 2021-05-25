export type Json = number | string | boolean | { [key: string]: Json } | Json[];

export function jsonEq(left: Json, right: Json): boolean {
  if (typeof left !== typeof right) {
    return false;
  }
  switch (typeof left) {
    case "number":
    case "boolean":
    case "string":
      return left === right;
    case "object":
      const leftKeys = Object.keys(left);
      if (leftKeys.length !== Object.keys(right).length) {
        return false;
      }
      for (let i = 0; i < leftKeys.length; i++) {
        const key = leftKeys[i];
        if (!jsonEq(left[key], right[key])) {
          return false;
        }
      }
      return true;
  }
}
