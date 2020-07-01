#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var pp = require("prettier-printer");
var pretty_1 = require("../pretty");
var json2dl_1 = require("../util/json2dl");
var fs = require("fs");
var data = fs.readFileSync(0, "utf-8");
var json = JSON.parse(data);
json2dl_1.jsonToDL(json, function (rec) {
    console.log(pp.render(1000, pretty_1.prettyPrintTerm(rec)) + ".");
});
