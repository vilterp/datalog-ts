import { runSuites, Suite } from "./util/testBench/testing";
import { coreTests } from "./core/tests";
import { lwbTests } from "./languageWorkbench/tests";
import { appsTests } from "./apps/tests";
import { utilTests } from "./util/tests";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

// TODO: nested suites
const suites: { [name: string]: Suite } = {
  ...coreTests(writeResults),
  ...lwbTests(writeResults),
  ...appsTests(writeResults),
  ...utilTests(writeResults),
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
