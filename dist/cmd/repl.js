#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var repl_1 = require("../repl");
var fs = require("fs");
var interp = new repl_1.Repl(process.stdin, process.stdout, process.stdin.isTTY ? "repl" : "pipe", process.argv[2] || "", repl_1.fsLoader);
interp.run();
if (process.argv.length === 4) {
    var contents = fs.readFileSync(process.argv[3]);
    contents
        .toString()
        .split("\n")
        .forEach(function (line) { return interp.handleLine(line); });
}
