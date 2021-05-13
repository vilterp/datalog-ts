import {
  array,
  falseTerm,
  int,
  rec,
  Rec,
  str,
  Term,
  trueTerm,
} from "../core/types";
import { Json } from "./json";

export function jsonToDL(json: Json, emit: (rec: Rec) => void) {
  recurse([], json, emit);
}

function recurse(pathSoFar: Term[], json: Json, emit: (rec: Rec) => void) {
  if (json === null) {
    return;
  }
  switch (typeof json) {
    case "object":
      if (Array.isArray(json)) {
        json.map((item, idx) => {
          recurse([...pathSoFar, int(idx)], item, emit);
        });
      } else {
        Object.keys(json).forEach((key) => {
          recurse([...pathSoFar, str(key)], json[key], emit);
        });
      }
      break;
    case "boolean":
    case "string":
    case "number":
      emit(
        rec("val", {
          path: array(pathSoFar),
          val: primitiveToTerm(json),
        })
      );
      break;
    default:
      throw new Error(`not json: ${json}`);
  }
}

function primitiveToTerm(v: boolean | number | string): Term {
  switch (typeof v) {
    case "boolean":
      return v ? trueTerm : falseTerm;
    case "number":
      return int(v); // TOOD: float...
    case "string":
      return str(v);
    default:
      throw new Error("wut");
  }
}
