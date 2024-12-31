import { Suite } from "../util/testBench/testing";
import { languageTests } from "./ddTests";
import { nativeTests } from "./languages/dl/nativeTests";
import { dl2Tests } from "./languages/dl2/compiler/ddTests";
import { parserlibTests } from "./parserlib/ddTests";
import { sourcePositionsTests } from "./sourcePositionsTest";

export function lwbTests(writeResults: boolean): { [name: string]: Suite } {
  return {
    parserlibTests: parserlibTests(writeResults),
    languageTests: languageTests(writeResults),
    lwbNativeDatalogTests: nativeTests,
    dl2Tests: dl2Tests(writeResults),
    sourcePositionsTests,
  };
}
