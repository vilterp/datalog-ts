import { assert, Suite } from "../util/testBench/testing";
import { runDDTestAtPath, TestOutput } from "../util/ddTest";
import { SimpleInterpreter } from "./simple/interpreter";
import { ppt } from "./pretty";
import { fsLoader } from "./fsLoader";
import { datalogOut, graphvizOut, jsonOut } from "../util/ddTest/types";
import { AbstractInterpreter } from "./abstractInterpreter";
import { IncrementalInterpreter } from "./incremental/interpreter";
import { traceToGraph } from "./traceGraph";
import { prettyPrintGraph } from "../util/graphviz";
import { parseMain, parseRule } from "../languageWorkbench/languages/dl/parser";
import {
  parserRuleToInternal,
  parserStatementToInternal,
} from "./translateAST";
import {
  getConjunctGraph,
  getJoinOrder,
  getRecord,
  joinGraphToGraphviz,
} from "./joinOrder";

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
  getInterp: () => AbstractInterpreter,
  exclude: Set<string> = null
): Suite {
  return [
    "simple",
    "family",
    "recurse",
    "literals",
    "negation",
    "aggregation",
    "paths",
    "timeStep",
  ]
    .filter((suite) => (exclude !== null ? !exclude.has(suite) : true))
    .map((name) => ({
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

export function joinOrderTests(writeResults: boolean) {
  return [
    {
      name: "joinOrder",
      test() {
        runDDTestAtPath(
          "core/testdata/joinOrder.dd.txt",
          joinOrderTest,
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
    // console.log("======");
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

function joinOrderTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const lines = input.split("\n");
    const first = lines[0];
    const rest = lines.slice(1).join("\n");
    const rawRule = parseRule(rest);
    const rule = parserRuleToInternal(rawRule);
    assert(rule.body.disjuncts.length === 1, "disjuncts length 1");
    const conjuncts = rule.body.disjuncts[0].conjuncts;
    switch (first) {
      case "graph": {
        const [graph, entries] = getConjunctGraph(conjuncts);
        const graphvizGraph = joinGraphToGraphviz(graph, entries);
        return graphvizOut(prettyPrintGraph(graphvizGraph));
      }
      case "order": {
        return jsonOut(
          getJoinOrder(conjuncts).map(
            (conjunct) => getRecord(conjunct).relation
          )
        );
      }
    }
  });
}
