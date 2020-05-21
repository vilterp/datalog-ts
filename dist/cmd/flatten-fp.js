#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var pp = require("prettier-printer");
var pretty_1 = require("../pretty");
var parser_1 = require("../fp/parser");
var flatten_1 = require("../fp/flatten");
var fs = require("fs");
var data = fs.readFileSync(0, "utf-8");
var parsed = parser_1.language.program.tryParse(data);
var flattened = flatten_1.flatten(parsed);
var printed = flattened.map(pretty_1.prettyPrintTerm);
var rendered = printed.map(function (t) { return pp.render(100, t) + "."; });
rendered.forEach(function (r) { return console.log(r); });
