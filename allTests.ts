import { runSuites } from "./testing";
import { unifyTests } from "./unifyTests";
import { queryTests } from "./queryTests";
import { parserTests } from "./parserTest";
import { dataDrivenTests } from "./dataDrivenTests";

const suites = {
  unifyTests,
  queryTests,
  parserTests,
  dataDrivenTests,
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
