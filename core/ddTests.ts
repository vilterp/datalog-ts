import { Suite } from "../util/testBench/testing";
import { runDDTestAtPath, TestOutput } from "../util/ddTest";
import { SimpleInterpreter } from "./simple/interpreter";
import { ppt } from "./pretty";
import { fsLoader } from "./fsLoader";
import { datalogOut, graphvizOut, jsonOut } from "../util/ddTest/types";
import { AbstractInterpreter } from "./abstractInterpreter";
import { IncrementalInterpreter } from "./incremental/interpreter";
import { traceToGraph } from "./traceGraph";
import { prettyPrintGraph } from "../util/graphviz";
import { parseMain } from "../languageWorkbench/languages/dl/parser";
import { parserStatementToInternal } from "./translateAST";
import { nullLoader } from "./loaders";
import { getTopologicallyOrderedSCCs } from "./simple/depgraph";
import { pairsToObj } from "../util/util";

export function parserTests(writeResults: boolean): Suite {
  return [
    {
      name: "parser",
      test() {
        runDDTestAtPath(
          "core/testdata/parser.dd.txt",
          (test) => {
            return test.map((input) => {
              const tree = parseMain(input);
              const output = tree.statement.map(parserStatementToInternal);
              return jsonOut(output);
            });
          },
          writeResults
        );
      },
    },
  ];
}

export function coreTestsSimple(writeResults: boolean): Suite {
  return [
    ...coreTests(writeResults, () => new SimpleInterpreter(".", fsLoader)),
    {
      name: "builtins",
      test() {
        runDDTestAtPath(
          "core/testdata/builtins.dd.txt",
          (test) =>
            putThroughInterp(test, () => new SimpleInterpreter(".", fsLoader)),
          writeResults
        );
      },
    },
  ];
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
  return [
    "simple",
    "family",
    "recurse",
    "literals",
    "negation",
    "aggregation",
    "paths",
  ].map((name) => ({
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
    {
      name: "depGraph",
      test() {
        runDDTestAtPath(
          "core/testdata/depGraph.dd.txt",
          depGraphTest,
          writeResults
        );
      },
    },
  ];
}

function putThroughInterp(
  test: string[],
  getInterp: () => AbstractInterpreter
): TestOutput[] {
  let interp = getInterp();

  const results: TestOutput[] = [];

  for (const input of test) {
    try {
      const [stmtResult, newInterp] = interp.evalStr(input + "\n");
      interp = newInterp;

      results.push(datalogOut(stmtResult.map((res) => res.term)));
    } catch (e) {
      console.log(e);
      throw new Error(`failed on input "${input}"`);
    }
  }

  return results;
}

function traceGraphTest(test: string[]): TestOutput[] {
  let interp: AbstractInterpreter = new SimpleInterpreter(".", fsLoader);
  interp = interp.doLoad("core/testdata/family_facts.dl");
  interp = interp.doLoad("core/testdata/family_rules.dl");
  return test.map((input) => {
    const results = interp.queryStr(input);
    // TODO: graphvizOut won't really work if there are multiple results...
    //   oh well, just try to restrict test queries to one result.
    return graphvizOut(
      results
        .map((res) => {
          const graph = traceToGraph(res);
          return prettyPrintGraph(graph);
        })
        .join("\n")
    );
  });
}

function depGraphTest(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);
    interp = interp.evalStr(input)[1];
    const res = getTopologicallyOrderedSCCs(
      pairsToObj(
        interp
          .getRules()
          .map((rule) => ({ key: rule.head.relation, value: rule }))
      ),
      interp.getTables()
    );
    return jsonOut(res);
  });
}
