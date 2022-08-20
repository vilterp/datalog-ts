import { rec, str, Rec, array, int, Value, bool } from "../core/types";
import { Json } from "./json";

type ADT = { type: string; [more: string]: Json };

export function jsonToDL(json: Json): Value {
  switch (typeof json) {
    case "number":
      return int(json);
    case "string":
      return str(json);
    case "boolean":
      return bool(json);
    case "object":
      if (Array.isArray(json)) {
        return array(json.map(jsonToDL));
      }
      // this might not always be desired... but meh
      if (json.hasOwnProperty("type") && typeof json.type === "string") {
        return adtToRec(json as ADT);
      }
      const out: { [key: string]: Value } = {};
      for (const key in json) {
        out[key] = jsonToDL(json[key]);
      }
      return rec("", out);
    default:
      throw new Error(`unsupported value: ${json}`);
  }
}

export function adtToRec(adt: ADT): Rec {
  const copy = { ...adt };
  delete copy.type;
  return rec(adt.type, (jsonToDL(copy) as Rec).attrs);
}

export function dlToJson(term: Value, addTypeTags: boolean = true): Json {
  switch (term.type) {
    case "StringLit":
      return term.val;
    case "Bool":
      return term.val;
    case "IntLit":
      return term.val;
    case "Record":
      const out: Json = {};
      for (const key in term.attrs) {
        out[key] = dlToJson(term.attrs[key], addTypeTags);
      }
      if (addTypeTags) {
        if (term.relation) {
          out.type = term.relation;
        }
      }
      return out;
    case "Array":
      return term.items.map((i) => dlToJson(i, addTypeTags));
  }
}
