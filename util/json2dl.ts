import {
  array,
  falseTerm,
  int,
  rec,
  Rec,
  str,
  StringLit,
  Term,
  trueTerm,
} from "../types";
import { prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";

const fs = require("fs");
const data = fs.readFileSync(0, "utf-8");
const json = JSON.parse(data);

type Json = number | string | boolean | { [key: string]: Json } | Json[];

function jsonToDL(json: Json, emit: (rec: Rec) => void) {
  recurse([], json, emit);
}

function recurse(pathSoFar: StringLit[], json: Json, emit: (rec: Rec) => void) {
  switch (typeof json) {
    case "object":
      // I guess this covers arrays as well?
      Object.keys(json).forEach((key) => {
        pathSoFar.push(str(key));
        recurse(pathSoFar, json[key], emit);
        pathSoFar.pop();
      });
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

jsonToDL(json, (rec) => {
  console.log(pp.render(1000, prettyPrintTerm(rec)) + ".");
});
