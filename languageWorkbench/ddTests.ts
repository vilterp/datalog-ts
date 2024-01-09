import { fsLoader } from "../core/fsLoader";
import { SimpleInterpreter } from "../core/simple/interpreter";
import { InterpCache, addCursor } from "./interpCache";
import { TestOutput } from "../util/ddTest";
import { runDDTestAtPathTwoVariants } from "../util/ddTest/runner";
import { datalogOut } from "../util/ddTest/types";
import * as fs from "fs";
import { Suite } from "../util/testBench/testing";
import { LanguageSpec, dl, dl2 } from "./common/types";
import { IncrementalInterpreter } from "../core/incremental/interpreter";

const BASE_PATH = "languageWorkbench/common";

const SIMPLE_CACHE = new InterpCache(
  () => new SimpleInterpreter(BASE_PATH, fsLoader)
);
const INCR_CACHE = new InterpCache(
  () => new IncrementalInterpreter(BASE_PATH, fsLoader)
);

export function lwbTests(writeResults: boolean): Suite {
  return [
    "fp",
    "sql",
    "dl",
    "dl2",
    "grammar",
    "modelica",
    "treeSQL",
    "basicBlocks",
    "contracts",
    "opt",
  ].map((lang) => ({
    name: lang,
    test() {
      runDDTestAtPathTwoVariants(
        `languageWorkbench/languages/${lang}/${lang}.dd.txt`,
        {
          name: "simple",
          getResults: (test) => testLangQuery(test, SIMPLE_CACHE),
        },
        {
          name: "incremental",
          getResults: (test) => testLangQuery(test, INCR_CACHE),
        },
        writeResults
      );
    },
  }));
}

export function testLangQuery(
  test: string[],
  cache: InterpCache
): TestOutput[] {
  const output = test.map((input) => {
    const lines = input.split("\n");
    const langName = lines[0];
    const exampleWithCursor = lines.slice(1, lines.length - 1).join("\n");
    const { input: example, cursorPos } = extractCursor(exampleWithCursor);
    const query = lines[lines.length - 1];

    const basePath = `languageWorkbench/languages/${langName}/${langName}`;
    const langSpec: LanguageSpec = {
      name: langName,
      logic: fs.existsSync(`${basePath}.dl2`)
        ? dl2(fs.readFileSync(`${basePath}.dl2`, "utf8"))
        : dl(fs.readFileSync(`${basePath}.dl`, "utf8")),
      grammar: fs.readFileSync(`${basePath}.grammar`, "utf8"),
      example: "",
    };
    const { interp: withoutCursor } = cache.getInterpForDoc(
      langName,
      { [langName]: langSpec },
      `test.${langName}`,
      example
    );
    const finalInterp = addCursor(withoutCursor, cursorPos);
    try {
      const results = finalInterp.queryStr(query);
      cache.clear();
      return datalogOut(results.map((res) => res.term));
    } catch (e) {
      console.log(e);
      throw new Error(`failed on input "${input}"`);
    }
  });
  return output;
}

const CURSOR = "|||";

export function extractCursor(input: string): {
  input: string;
  cursorPos: number;
} {
  const split = input.split(CURSOR, 2);
  if (split.length === 1) {
    return { input, cursorPos: 1 };
  }
  return { input: split[0] + split[1], cursorPos: split[0].length };
}
