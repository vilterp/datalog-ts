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
import { raceDetectorTests } from "./apps/raceDetector/ddTests";
import { kvSyncTests } from "./apps/actors/systems/kvSync/ddTests";
import { lwbTestsIncr, lwbTestsSimple } from "./languageWorkbench/ddTests";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites: { [name: string]: Suite } = {
  // unifyTests,
  // parserTests: parserTests(writeResults),
  // // TODO: it does seem kind of bad to have two test suites that use the same set of dd files
  // coreTestsSimple: coreTestsSimple(writeResults),
  coreTestsIncremental: coreTestsIncremental(writeResults),
  // coreTestsCommon: coreTestsCommon(writeResults),
  // joinOrderTests: joinOrderTests(writeResults),
  // incrTests: incrTests(writeResults),
  // prettyPrintTests,
  // treeTests,
  // parserlibTests: parserlibTests(writeResults),
  // sourcePositionsTests,
  // kvSync: kvSyncTests(writeResults),
  // raceDetector: raceDetectorTests(writeResults),
  // lwbTestsSimple: lwbTestsSimple(writeResults),
  // lwbTestsIncr: lwbTestsIncr(writeResults),
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
