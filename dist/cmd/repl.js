#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var repl_1 = require("../repl");
var fs = require("fs");
var repl = new repl_1.Repl(process.stdin, process.stdout, process.stdin.isTTY, process.argv[2] || "");
repl.run();
if (process.argv.length === 4) {
    var contents = fs.readFileSync(process.argv[3]);
    contents
        .toString()
        .split("\n")
        .forEach(function (line) { return repl.handleLine(line); });
}
