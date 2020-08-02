import * as readline from "readline";
import * as pp from "prettier-printer";
import { prettyPrintTerm } from "../pretty";
import { rec, str, Rec } from "../types";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  try {
    const evtRec = lineToRec(line);
    console.log(pp.render(1000, prettyPrintTerm(evtRec)) + ".");
  } catch (e) {
    console.error(e);
  }
});

function lineToRec(line: string): Rec {
  const evt = JSON.parse(line);

  const base = {
    id: str(evt.id),
    evt: str(evt.trace_evt),
    ts: str(evt.ts),
  };

  switch (evt.trace_evt) {
    case "start_span":
      return rec("trace_evt.start_span", {
        ...base,
        parent_id: str(evt.parent_id),
        op: str(evt.op),
      });
    case "finish_span":
      return rec("trace_evt.finish_span", base);
    case "log":
      return rec("trace_evt.log", { ...base, line: str(evt.line) });
  }
}
