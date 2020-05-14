#!/usr/bin/env ts-node
import { Repl } from "../repl";
import * as fs from "fs";

const repl = new Repl(
  process.stdin,
  process.stdout,
  process.stdin.isTTY,
  process.argv[2] || ""
);
repl.run();

if (process.argv.length === 4) {
  const contents = fs.readFileSync(process.argv[3]);
  contents
    .toString()
    .split("\n")
    .forEach((line) => repl.handleLine(line));
}
