#!/usr/bin/env node
import { Repl } from "./repl";
import * as fs from "fs";
import { fsLoader } from "../../../core/fsLoader";

const repl = new Repl(
  process.stdin,
  process.stdout,
  process.stdin.isTTY ? "repl" : "pipe",
  process.argv[2] || "",
  fsLoader
);
repl.run();

if (process.argv.length === 4) {
  const contents = fs.readFileSync(process.argv[3]);
  contents
    .toString()
    .split("\n")
    .forEach((line) => repl.handleLine(line));
}
