import { ppr, ppRule, ppt } from "../../core/pretty";
import { Res, Rule, Term } from "../../core/types";
import { Json } from "../json";
import { joinLinesWithTrailing } from "../util";

export type Archive = { [path: string]: DDTest };

export type DDTest = IOPair[];

export type ProcessFn = (input: string[]) => TestOutput[];

interface IOPair {
  lineNo: number; // 1-indexed
  input: string;
  output: TestOutput;
}

export type TestOutput = { content: string; mimeType: string };

export type Result = { pair: IOPair; actual: TestOutput };

export function resultsToStr(results: Result[]): string {
  const resultStrs = results.map((r) => {
    const out = [r.pair.input, "----", r.actual.mimeType || "text/plain"];
    if (r.actual.content.length > 0) {
      out.push(r.actual.content);
    }
    return out.join("\n");
  });
  return resultStrs.join("\n\n") + "\n";
}

export function plainTextOut(content: string): TestOutput {
  return {
    content,
    mimeType: "text/plain",
  };
}

export function jsonOut(content: Json): TestOutput {
  return {
    content: JSON.stringify(content, null, 2),
    mimeType: "application/json",
  };
}

export function datalogOut(terms: Term[]): TestOutput {
  return {
    content: joinLinesWithTrailing(".", terms.map(ppt)),
    mimeType: "application/datalog",
  };
}

export function datalogOutResults(terms: Res[]): TestOutput {
  return {
    content: joinLinesWithTrailing(".", terms.map(ppr)),
    mimeType: "application/datalog-results",
  };
}

export function datalogOutRules(terms: Rule[]): TestOutput {
  return {
    content: joinLinesWithTrailing(".", terms.map(ppRule)),
    mimeType: "application/datalog",
  };
}

export function graphvizOut(content: string): TestOutput {
  return {
    content,
    mimeType: "application/graphviz",
  };
}
