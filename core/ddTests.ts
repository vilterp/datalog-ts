import { Suite } from "../util/testing";
import { runDDTestAtPath, TestOutput } from "../util/ddTest";
import { SimpleInterpreter } from "./simple/interpreter";
import { ppt } from "./pretty";
import { fsLoader } from "./fsLoader";
import { datalogOut, plainTextOut } from "../util/ddTest/types";
import { AbstractInterpreter } from "./abstractInterpreter";
import { IncrementalInterpreter } from "./incremental/interpreter";
import { traceToGraph } from "./traceGraph";
import { prettyPrintGraph } from "../util/graphviz";

export function coreTestsSimple(writeResults: boolean): Suite {
  return coreTests(writeResults, () => new SimpleInterpreter(".", fsLoader));
}

export function coreTestsIncremental(writeResults: boolean): Suite {
  return coreTests(
    writeResults,
    () => new IncrementalInterpreter(".", fsLoader)
  );
}

function coreTests(
  writeResults: boolean,
  getInterp: () => AbstractInterpreter
): Suite {
  return ["simple", "family", "recurse", "literals"].map((name) => ({
    name,
    test() {
      runDDTestAtPath(
        `core/testdata/${name}.dd.txt`,
        (test: string[]) => putThroughInterp(test, getInterp),
        writeResults
      );
    },
  }));
}

export function coreTestsCommon(writeResults: boolean): Suite {
  return [
    {
      name: "traceGraph",
      test() {
        runDDTestAtPath(
          "core/testdata/traceGraph.dd.txt",
          traceGraphTest,
          writeResults
        );
      },
    },
  ];
}

export function putThroughInterp(
  test: string[],
  getInterp: () => AbstractInterpreter
): TestOutput[] {
  let interp = getInterp();

  const results: TestOutput[] = [];

  for (const input of test) {
    const [stmtResult, newInterp] = interp.evalStr(input + "\n");
    interp = newInterp;

    results.push(
      datalogOut(
        stmtResult
          .map((res) => ppt(res.term) + ".")
          .sort()
          .join("\n")
      )
    );
  }

  return results;
}

function traceGraphTest(test: string[]): TestOutput[] {
  let interp: AbstractInterpreter = new SimpleInterpreter(".", fsLoader);
  interp = interp.doLoad("core/testdata/family_facts.dl");
  interp = interp.doLoad("core/testdata/family_rules.dl");
  return test.map((input) => {
    const results = interp.queryStr(input);
    return plainTextOut(
      results
        .map((res) => {
          const graph = traceToGraph(res);
          return prettyPrintGraph(graph);
        })
        .join("\n")
    );
  });
}
