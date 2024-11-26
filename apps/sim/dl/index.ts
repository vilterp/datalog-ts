import { makeMemoryLoader } from "../../../core/loaders";

// @ts-ignore
import mainDL from "./main.dl";
// @ts-ignore
import simDL from "./sim.dl";
// @ts-ignore
import vizDL from "./viz.dl";
// @ts-ignore
import optDL from "./opt.dl";
// @ts-ignore
import scenarioDL from "./scenario.dl";

export const loader = makeMemoryLoader({
  "main.dl": mainDL,
  "sim.dl": simDL,
  "viz.dl": vizDL,
  "opt.dl": optDL,
  "scenario.dl": scenarioDL,
});
