import { unifyTests } from "./unifyTests";
import { queryTests } from "./queryTests";
import { runSuites } from "./testing";

const suites = {
  unifyTests,
  queryTests,
};

runSuites(suites);
