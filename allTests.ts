import { runSuites, Suite } from "./util/testBench/testing";
import { unifyTests } from "./core/unifyTests";
import {
  coreTestsSimple,
  coreTestsIncremental,
  coreTestsCommon,
  parserTests,
} from "./core/ddTests";
import { prettyPrintTests } from "./core/prettyTest";
import { treeTests } from "./util/treeTest";
import { parserlibTests } from "./languageWorkbench/parserlib/ddTests";
import { incrTests } from "./core/incremental/ddTests";
import { lwbTests } from "./languageWorkbench/ddTests";
import { sourcePositionsTests } from "./languageWorkbench/sourcePositionsTest";
import { raceDetectorTests } from "./apps/raceDetector/ddTests";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites: { [name: string]: Suite } = {
  unifyTests,
  parserTests: parserTests(writeResults),
  // TODO: it does seem kind of bad to have two test suites that use the same set of dd files
  coreTestsSimple: coreTestsSimple(writeResults),
  // coreTestsIncremental: coreTestsIncremental(writeResults),
  coreTestsCommon: coreTestsCommon(writeResults),
  incrTests: incrTests(writeResults),
  prettyPrintTests,
  treeTests,
  parserlibTests: parserlibTests(writeResults),
  sourcePositionsTests,
  raceDetector: raceDetectorTests(writeResults),
  lwbTests: lwbTests(writeResults),
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
