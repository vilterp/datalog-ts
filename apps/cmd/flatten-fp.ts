#!/usr/bin/env node
import * as pp from "prettier-printer";
import { prettyPrintTerm } from "../../core/pretty";
import { language } from "../fp/parser";
import { flatten } from "../fp/flatten";

const fs = require("fs");
const data = fs.readFileSync(0, "utf-8");

const parsed = language.expr.tryParse(data);
const flattened = flatten(parsed);
const printed = flattened.map(prettyPrintTerm);
const rendered = printed.map((t) => pp.render(100, t) + ".");

rendered.forEach((r) => console.log(r));
