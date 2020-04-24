import { Repl } from "./repl";

const repl = new Repl(
  process.stdin,
  process.stdout,
  process.stdin.isTTY,
  process.argv[2] || ""
);
repl.run();
