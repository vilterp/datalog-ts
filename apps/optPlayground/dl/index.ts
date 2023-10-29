import { makeMemoryLoader } from "../../../core/loaders";

// @ts-ignore
import optDL from "./opt.dl";

export const loader = makeMemoryLoader({
  "opt.dl": optDL,
});
