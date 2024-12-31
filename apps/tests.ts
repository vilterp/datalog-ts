import { Suite } from "../util/testBench/testing";
import { kvSyncTests } from "./actors/systems/kvSync/ddTests";
import { executionVisualizerTests } from "./executionVisualizer/ddTests";

export function appsTests(writeResults: boolean): { [name: string]: Suite } {
  return {
    kvSync: kvSyncTests(writeResults),
    executionVisualizer: executionVisualizerTests(writeResults),
  };
}
