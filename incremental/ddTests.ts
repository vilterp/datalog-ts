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
      `.trace ast.Var{id: 0, location: span{from: 0, to: 10}, name: "intToString"}.`,
      `.trace lang.Builtin{name: "intToString", type: tapp{from: "int", to: "string"}}.`,
    ],
    visualizers: VISUALIZERS,
  },
  {
    name: "fp",
    func: evalTest,
    inputs: [
      `.load ./ast.dl`,
      `.load ./typecheck.dl`,
      `.trace lang.Builtin{name: "intToString", type: tapp{from: "int", to: "string"}}.`,
      `.trace ast.FuncCall{argID: 2, funcID: 1, id: 0, location: span{from: 0, to: 13}}.`,
      `.trace ast.Var{id: 1, location: span{from: 0, to: 10}, name: "intToString"}.`,
      `.trace ast.IntLit{id: 2, location: span{from: 11, to: 12}, val: 2}.`,
    ],
    visualizers: VISUALIZERS,
  },
  // {
  //   name: "siblings",
  //   func: evalTest,
  //   inputs: [
  //     `.table mother`,
  //     `.table father`,
  //     `parents{child: C, mother: M, father: F} :-
  //       mother{child: C, mother: M} &
  //       father{child: C, father: F}.`,
  //     `sibling{left: L, right: R} :-
  //       parents{child: L, mother: M, father: F} &
  //       parents{child: R, mother: M, father: F} &
  //       L != R.`,
  //     `.rulegraph`,
  //     `mother{child: "Pete", mother: "Mary"}.`,
  //     `father{child: "Pete", father: "Paul"}.`,
  //     `mother{child: "Carolyn", mother: "Mary"}.`,
  //     `.trace father{child: "Carolyn", father: "Paul"}.`,
  //     `mother{child: "Steve", mother: "Jill"}.`,
  //     `mother{child: C, mother: M}.`,
  //     `mother{child: C, mother: "Mary"}.`,
  //   ],
  //   visualizers: VISUALIZERS,
  // },
  // {
  //   name: "grandfather",
  //   func: evalTest,
  //   visualizers: VISUALIZERS,
  //   inputs: [
  //     `.table mother`,
  //     ".table father",
  //     `parent{child: C, parent: P} :-
  //       mother{child: C, mother: P} |
  //       father{child: C, father: P}.`,
  //     `grandfather{grandchild: A, grandfather: C} :-
  // parent{child: A, parent: B} &
  // father{child: B, father: C}.`,
  //     `.trace father{child: "Pete", father: "Paul"}.`,
  //     `.trace father{child: "Paul", father: "Peter"}.`,
  //   ],
  // },
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
