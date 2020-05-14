#!/usr/bin/env ts-node
import { Repl } from "../repl";
import * as fs from "fs";
import { identityTransform } from "../replTests";

const input = identityTransform();
process.stdin.pipe(input);

const repl = new Repl(
  input,
  process.stdout,
  process.stdin.isTTY,
  process.argv[2] || ""
);
repl.run();

if (process.argv.length === 4) {
  const contents = fs.readFileSync(process.argv[3]);
  input.write(contents);
}
