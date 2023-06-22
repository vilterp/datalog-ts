import { runSuites, Suite } from "./util/testBench/testing";
import { unifyTests } from "./core/unifyTests";
import {
  coreTestsCommon,
  parserTests,
  joinOrderTests,
  coreTests,
} from "./core/ddTests";
import { prettyPrintTests } from "./core/prettyTest";
import { treeTests } from "./util/treeTest";
import { parserlibTests } from "./languageWorkbench/parserlib/ddTests";
import { incrTests } from "./core/incremental/ddTests";
import { sourcePositionsTests } from "./languageWorkbench/sourcePositionsTest";
import { executionVisualizerTests } from "./apps/executionVisualizer/ddTests";
import { kvSyncTests } from "./apps/actors/systems/kvSync/ddTests";
import { nativeTests } from "./languageWorkbench/languages/dl/nativeTests";
import { lwbTests } from "./languageWorkbench/ddTests";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites: { [name: string]: Suite } = {
  unifyTests,
  parserTests: parserTests(writeResults),
  coreTests: coreTests(writeResults),
  coreTestsCommon: coreTestsCommon(writeResults), // TODO: rename
  joinOrderTests: joinOrderTests(writeResults),
  incrTests: incrTests(writeResults),
  prettyPrintTests,
  treeTests,
  parserlibTests: parserlibTests(writeResults),
  sourcePositionsTests,
  kvSync: kvSyncTests(writeResults),
  executionVisualizer: executionVisualizerTests(writeResults),
  lwbTests: lwbTests(writeResults),
  lwbNativeDatalogTests: nativeTests,
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
