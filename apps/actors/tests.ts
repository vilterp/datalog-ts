import { runSuites } from "./testing-utils-ts/testing";
import { protocol } from "./protocolTest";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites = {
  protocol: protocol(writeResults),
};

const passed = runSuites(suites);
if (!passed) {
  if (!stayAlive) {
    console.log("exiting");
    process.exit(-1);
  }
}

if (stayAlive) {
  console.log("keeping VM alive for inspector...");
  setInterval(() => {}, 100);
}
