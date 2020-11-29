// ah, nothing like a hand written parser
import { DDTest } from "./types";

export function parseDDTest(str: string): DDTest {
  const out: DDTest = [];
  let lineNo = 1;
  let inputLineNo = 1;
  let state: "input" | "output" = "input";
  let curInput = [];
  let curOutput = [];
  for (const line of str.split("\n")) {
    if (state === "input") {
      if (line === "----") {
        inputLineNo = lineNo - 1;
        state = "output";
      } else {
        if (line !== "" && !line.startsWith("#")) {
          curInput.push(line);
        }
      }
    } else if (state === "output") {
      if (line === "") {
        out.push({
          lineNo: inputLineNo,
          input: curInput.join("\n"),
          output: {
            content: curOutput.slice(1).join("\n"),
            mimeType: curOutput[0],
          },
        });
        curOutput = [];
        curInput = [];
        state = "input";
      } else {
        curOutput.push(line);
      }
    }
    lineNo++;
  }
  return out;
}
