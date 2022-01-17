import { runSuites, Suite } from "./util/testBench/testing";
import { unifyTests } from "./core/unifyTests";
import { parserTests } from "./core/parserTest";
import {
  coreTestsSimple,
  coreTestsIncremental,
  coreTestsCommon,
} from "./core/ddTests";
import { fpTests } from "./apps/fp/ddTests";
import { json2DLTests } from "./util/json2dlTest";
import { prettyPrintTests } from "./core/prettyTest";
import { treeTests } from "./util/treeTest";
import { actionsTests } from "./uiCommon/ide/actionsTest";
import { parserlibTests } from "./parserlib/ddTests";
import { incrTests } from "./core/incremental/ddTests";
import { uiCommonTests } from "./uiCommon/dl/ddTest";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites: { [name: string]: Suite } = {
  unifyTests,
  parserTests,
  // TODO: it does seem kind of bad to have two test suites that use the same set of dd files
  coreTestsSimple: coreTestsSimple(writeResults),
  coreTestsIncremental: coreTestsIncremental(writeResults),
  coreTestsCommon: coreTestsCommon(writeResults),
  incrTests: incrTests(writeResults),
  fpTests: fpTests(writeResults),
  json2DLTests,
  prettyPrintTests,
  treeTests,
  actionsTests,
  parserlibTests: parserlibTests(writeResults),
  uiCommonTests: uiCommonTests(writeResults),
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
