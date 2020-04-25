import { assertStringEqual, Suite } from "./testing";
import { Repl } from "./repl";
import * as stream from "stream";
import * as fs from "fs";

export const dataDrivenTests: Suite = [
  {
    name: "simple",
    test() {
      runDDTestAtPath("testdata/simple.dd.txt");
    },
  },
  {
    name: "family",
    test() {
      runDDTestAtPath("testdata/family.dd.txt");
    },
  },
];

type DDTest = IOPair[];

interface IOPair {
  input: string;
  output: string;
}

function runDDTestAtPath(path: string) {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  runDDTest(test);
}

function runDDTest(test: DDTest) {
  const input = identityStream();
  const output = identityStream();
  const repl = new Repl(input, output, false, "");
  repl.run();

  // const initialPrompt = output.read();
  // assertStringEqual("> ", initialPrompt.toString());
  for (const pair of test) {
    console.log("=> ", pair.input);
    input.write(pair.input + "\n");

    const chunk = output.read();
    if (chunk === null) {
      continue;
    }
    console.log("<= ", chunk.toString());

    assertStringEqual(pair.output, chunk.toString());
  }
  input.end();
}

function parseDDTest(str: string): DDTest {
  const out: DDTest = [];
  let state: "input" | "output" = "input";
  let curInput = [];
  let curOutput = [];
  for (const line of str.split("\n")) {
    if (state === "input") {
      if (line === "----") {
        state = "output";
        continue;
      }
      curInput.push(line);
    } else if (state === "output") {
      if (line === "") {
        out.push({
          input: curInput.join("\n"),
          output: curOutput.length === 0 ? "" : curOutput.join("\n") + "\n",
        });
        curOutput = [];
        curInput = [];
        state = "input";
        continue;
      }
      curOutput.push(line);
    }
  }
  return out;
}

function identityStream(): stream.Transform {
  return new stream.Transform({
    transform(
      chunk: any,
      encoding: string,
      callback: (error?: Error | null, data?: any) => void
    ): void {
      callback(null, chunk);
    },
  });
}
