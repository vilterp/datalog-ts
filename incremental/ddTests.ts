import { runDDTestAtPath, DDTest, ProcessFn } from "../util/ddTest";
import { Suite } from "../testing";
import { language } from "../parser";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Statement } from "../types";
import { scan } from "../util";
import { formatOutput, newInterpreter, processStmt } from "./interpreter";
import {
  SuiteSpec,
  graphvizOut,
  plainTextOut,
  TestOutput,
} from "../util/ddTest/types";
import { VISUALIZERS } from "../util/ddTest/visualizers";
import { loader } from "../fp/dl";

export const testSpecs: SuiteSpec[] = [
  {
    name: "fp",
    func: evalTest,
    inputs: [
      `.load ./ast.dl`,
      `.load ./typecheck.dl`,
      `lang.Builtin{name: "intToString", type: tapp{from: "int", to: "string"}}.`,
      `.rulegraph`,
      `ast.RootExpr{id: 0}.`,
      `ast.FuncCall{argID: 2, funcID: 1, id: 0, location: span{from: 0, to: 13}}.`,
      `ast.Var{id: 1, location: span{from: 0, to: 10}, name: "int2string"}.`,
      `.trace ast.IntLit{id: 2, location: span{from: 11, to: 12}, val: 2}.`,
    ],
    visualizers: VISUALIZERS,
  },
];

// export function incrTests(writeResults: boolean): Suite {
//   const tests: [string, ProcessFn][] = [
//     ["build", buildTest],
//     ["buildBinExpr", buildTest],
//     ["eval", evalTest],
//     ["eval2", evalTest],
//     ["eval3", evalTest],
//     ["siblings", evalTest],
//     ["cycles", evalTest],
//     ["replay", evalTest],
//     ["cyclesReplay", evalTest],
//     ["fp", evalTest],
//   ];
//   return tests.map(([name, func]) => ({
//     name,
//     test() {
//       runDDTestAtPath(
//         `incremental/testdata/${name}.dd.txt`,
//         func,
//         writeResults
//       );
//     },
//   }));
// }

// TODO: deprecate this since we have .rulegraph now?
function buildTest(test: DDTest): TestOutput[] {
  return test.map((pair) => {
    const commands = pair.input
      .split(";")
      .map((s) => s.trim())
      .map(parseStatement);
    const curInterp = commands.reduce((accum, stmt) => {
      try {
        return processStmt(accum, stmt).newInterp;
      } catch (err) {
        throw new Error(
          `processing "${pair.input}" at line ${pair.lineNo}: ${err.stack}\n`
        );
      }
    }, newInterpreter(loader));
    return graphvizOut(prettyPrintGraph(toGraphviz(curInterp.graph)));
  });
}

function evalTest(inputs: string[]): TestOutput[] {
  return scan(
    newInterpreter(loader),
    (interp, input) => {
      try {
        const stmt = parseStatement(input);
        const { newInterp, output } = processStmt(interp, stmt);
        return {
          newState: newInterp,
          output: formatOutput(newInterp.graph, output, {
            emissionLogMode: "test",
            showBindings: true,
          }),
        };
      } catch (err) {
        throw new Error(`processing "${input}": ${err.stack}\n`);
      }
    },
    inputs
  );
}

// kind of reimplementing the repl here; lol

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}
