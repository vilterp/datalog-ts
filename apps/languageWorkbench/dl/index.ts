import { makeMemoryLoader } from "../../../core/loaders";
// @ts-ignore
import ruleTreeVizDL from "./ruleTreeViz.dl";
// @ts-ignore
import ideDL from "./ide.dl";

export const LOADER = makeMemoryLoader({
  "./ruleTreeViz.dl": ruleTreeVizDL,
  "./ide.dl": ideDL,
});
