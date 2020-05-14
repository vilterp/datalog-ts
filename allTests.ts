import { runSuites } from "./testing";
import { unifyTests } from "./unifyTests";
import { parserTests } from "./parserTest";
import { replTests } from "./replTests";
import { langTests } from "./lang/ddTests";
import { json2DLTests } from "./util/json2dlTest";

// TODO: use a real arg parser
const flags = new Set(process.argv.slice(2));
const writeResults = flags.has("--write-results");
const stayAlive = flags.has("--stay-alive");

const suites = {
  unifyTests,
  parserTests,
  replTests: replTests(writeResults),
  langParserTests: langTests(writeResults),
  json2DLTests,
};

try {
  runSuites(suites);
} catch (e) {
  if (stayAlive) {
    console.error(e);
  }
}

if (stayAlive) {
  console.log("keeping VM alive for inspector...");
  setInterval(() => {}, 100);
}
