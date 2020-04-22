import { unifyTests } from "./unifyTests";
import { queryTests } from "./queryTests";
import { runSuites } from "./testing";

const suites = {
  unifyTests,
  queryTests,
};

const stayAlive = process.argv[2] === "--stay-alive";
if (stayAlive) {
  console.log("keeping VM alive for inspector...");
  setInterval(() => {}, 100);
}

try {
  runSuites(suites);
} catch (e) {
  if (stayAlive) {
    console.error(e);
  }
}
