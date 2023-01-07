import { rec, str, Rec, array, int, Term, bool, dict } from "../core/types";
import { Json } from "./json";

type ADT = { type: string; [more: string]: Json };

export function jsonToDL(json: Json): Term {
  const res = (() => {
    if (json === null) {
      return rec("null", {});
    }
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
        const out: { [key: string]: Term } = {};
        for (const key in json) {
          out[key] = jsonToDL(json[key]);
        }
        if (json.hasOwnProperty("type") && typeof json.type === "string") {
          delete out.type;
          return rec(json.type, out);
        }
        return dict(out);
      default:
        throw new Error(`unsupported value: ${json}`);
    }
  })();
  // console.groupEnd();
  return res;
}

export function adtToRec(adt: ADT): Rec {
  return jsonToDL(adt) as Rec;
}

export function dlToJson(term: Term, addTypeTags: boolean = true): Json {
  switch (term.type) {
    case "StringLit":
      return term.val;
    case "Bool":
      return term.val;
    case "IntLit":
      return term.val;
    case "Record": {
      if (term.relation === "null" && Object.keys(term.attrs).length === 0) {
        return null;
      }
      if (term.relation === "") {
        throw new Error("empty relation name: " + JSON.stringify(term));
      }
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
    }
    case "Dict": {
      const out: Json = {};
      for (const key in term.map) {
        out[key] = dlToJson(term.map[key], addTypeTags);
      }
      return out;
    }
    case "Array":
      return term.items.map((i) => dlToJson(i, addTypeTags));
  }
}
