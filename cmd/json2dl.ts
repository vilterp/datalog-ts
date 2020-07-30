#!/usr/bin/env node
import * as pp from "prettier-printer";
import { prettyPrintTerm } from "../pretty";
import { jsonToDL } from "../util/json2dl";
import { Array, StringLit } from "../types";

const fs = require("fs");
const data = fs.readFileSync(0, "utf-8");
const json = JSON.parse(data);

console.log("appname,app_version,path,value");

jsonToDL(json, (rec) => {
  // console.log(pp.render(1000, prettyPrintTerm(rec)) + ".");
  console.log(
    `${process.argv[2]},live,"${(rec.attrs.path as Array).items
      .map((i) =>
        (i as StringLit).val
          .split(" ")
          .join("_")
          .split("-")
          .join("_")
          .split(":")
          .join("_")
          .split("%")
          .join("_")
          .split("=")
          .join("_")
      )
      .join(".")}",${pp
      .render(1000, prettyPrintTerm(rec.attrs.val))
      .split(",")
      .join(".")
      .split("'")
      .join(" ")
      .split("\n")
      .join(" ")}`
  );
});
