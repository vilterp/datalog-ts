import { makeMemoryLoader } from "../../../core/loaders";

// @ts-ignore
import mainDL from "./main.dl";
// @ts-ignore
import instrDL from "./instr.dl";
// @ts-ignore
import programCounterDL from "./programCounter.dl";
// @ts-ignore
import varDL from "./var.dl";
// @ts-ignore
import timerDL from "./timer.dl";
// @ts-ignore
import lockDL from "./lock.dl";
// @ts-ignore
import deadlockDL from "./deadlock.dl";
// @ts-ignore
import debugDL from "./debug.dl";
// @ts-ignore
import vizDL from "./viz.dl";

export const LOADER = makeMemoryLoader({
  "main.dl": mainDL,
  "instr.dl": instrDL,
  "programCounter.dl": programCounterDL,
  "var.dl": varDL,
  "timer.dl": timerDL,
  "lock.dl": lockDL,
  "deadlock.dl": deadlockDL,
  "debug.dl": debugDL,
  "viz.dl": vizDL,
});
