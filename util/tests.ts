import { Suite } from "./testBench/testing";
import { treeTests } from "./treeTest";

export function utilTests(writeResults: boolean): { [name: string]: Suite } {
  return {
    treeTests,
  };
}
