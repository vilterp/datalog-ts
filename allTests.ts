import { runSuites, Suite } from "./util/testBench/testing";
import { unifyTests } from "./core/unifyTests";
import {
  coreTestsSimple,
  coreTestsIncremental,
  coreTestsCommon,
  parserTests,
  joinOrderTests,
} from "./core/ddTests";
import { prettyPrintTests } from "./core/prettyTest";
import { treeTests } from "./util/treeTest";
import { parserlibTests } from "./languageWorkbench/parserlib/ddTests";
import { incrTests } from "./core/incremental/ddTests";
import { sourcePositionsTests } from "./languageWorkbench/sourcePositionsTest";
import { executionVisualizerTests } from "./apps/executionVisualizer/ddTests";
import { kvSyncTests } from "./apps/actors/systems/kvSync/ddTests";
import { nativeTests } from "./languageWorkbench/languages/dl/nativeTests";
import { dl2Tests, lwbTests } from "./languageWorkbench/ddTests";
import { optTests } from "./core/opt/optTests";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites: { [name: string]: Suite } = {
  unifyTests,
  parserTests: parserTests(writeResults),
  // TODO: it does seem kind of bad to have two test suites that use the same set of dd files
  coreTestsSimple: coreTestsSimple(writeResults),
  coreTestsIncremental: coreTestsIncremental(writeResults),
  coreTestsCommon: coreTestsCommon(writeResults),
  joinOrderTests: joinOrderTests(writeResults),
  incrTests: incrTests(writeResults),
  prettyPrintTests,
  treeTests,
  parserlibTests: parserlibTests(writeResults),
  sourcePositionsTests,
  kvSync: kvSyncTests(writeResults),
  executionVisualizer: executionVisualizerTests(writeResults),
  dl2Tests: dl2Tests(writeResults),
  lwbTests: lwbTests(writeResults),
  lwbNativeDatalogTests: nativeTests,
  optTests: optTests(writeResults),
};

try {
  runSuites(suites);
} catch (e) {
  console.error(e.message);
  if (!stayAlive) {
    console.log("exiting");
    process.exit(1);
  }
}

if (stayAlive) {
  console.log("keeping VM alive for inspector...");
  setInterval(() => {}, 100);
}
