import { Repl } from "./repl";

const repl = new Repl(process.stdin, process.stdout);
repl.run();
