import { makeMemoryLoader } from "../../../core/loaders";
// @ts-ignore
import ruleTreeVizDL from "./ruleTreeViz.dl";
// @ts-ignore
import commonDL from "./common.dl";

export const LOADER = makeMemoryLoader({
  "./ruleTreeViz.dl": ruleTreeVizDL,
  "./common.dl": commonDL,
});
