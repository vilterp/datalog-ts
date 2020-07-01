#!/usr/bin/env node
import * as pp from "prettier-printer";
import { prettyPrintTerm } from "../pretty";
import { jsonToDL } from "../util/json2dl";

const fs = require("fs");
const data = fs.readFileSync(0, "utf-8");
const json = JSON.parse(data);

jsonToDL(json, (rec) => {
  console.log(pp.render(1000, prettyPrintTerm(rec)) + ".");
});
