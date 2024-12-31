import { Suite } from "../util/testBench/testing";
import {
  coreTestsCommon,
  coreTestsIncremental,
  coreTestsSimple,
  joinOrderTests,
  parserTests,
} from "./ddTests";
import { incrTests } from "./incremental/ddTests";
import { optTests } from "./opt/optTests";
import { prettyPrintTests } from "./prettyTest";
import { unifyTests } from "./unifyTests";

export function coreTests(writeResults: boolean): { [name: string]: Suite } {
  return {
    unifyTests,
    parserTests: parserTests(writeResults),
    // TODO: it does seem kind of bad to have two test suites that use the same set of dd files
    coreTestsSimple: coreTestsSimple(writeResults),
    coreTestsIncremental: coreTestsIncremental(writeResults),
    coreTestsCommon: coreTestsCommon(writeResults),
    joinOrderTests: joinOrderTests(writeResults),
    incrTests: incrTests(writeResults),
    prettyPrintTests,
    optTests: optTests(writeResults),
  };
}
