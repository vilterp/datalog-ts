import { runSuites } from "./util/testing";
import { unifyTests } from "./core/unifyTests";
import { parserTests } from "./core/parserTest";
import { coreTests } from "./core/ddTests";
import { fpTests } from "./apps/fp/ddTests";
import { json2DLTests } from "./util/json2dlTest";
import { prettyPrintTests } from "./core/prettyTest";
import { treeTests } from "./util/treeTest";
import { actionsTests } from "./uiCommon/ide/actionsTest";
import { parserlibTests } from "./apps/parserlib/ddTests";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites = {
  unifyTests,
  parserTests,
  coreTests: coreTests(writeResults),
  fpTests: fpTests(writeResults),
  json2DLTests,
  prettyPrintTests,
  treeTests,
  actionsTests,
  parserlibTests: parserlibTests(writeResults),
};

try {
  runSuites(suites);
} catch (e) {
  console.error(e.message);
  if (!stayAlive) {
    console.log("exiting");
    process.exit(-1);
  }
}

if (stayAlive) {
  console.log("keeping VM alive for inspector...");
  setInterval(() => {}, 100);
}
