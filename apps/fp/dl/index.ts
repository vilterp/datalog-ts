import { makeMemoryLoader } from "../../../core/loaders";

// @ts-ignore
import typecheckDL from "./typecheck.dl";
// @ts-ignore
import ideDL from "./ide.dl";
// @ts-ignore
import stdlibDL from "./stdlib.dl";
// @ts-ignore
import highlightDL from "./highlight.dl";
// @ts-ignore
import astDL from "./ast.dl";
// @ts-ignore
import mainDL from "./main.dl";

export const loader = makeMemoryLoader({
  "./typecheck.dl": typecheckDL,
  "./ide.dl": ideDL,
  "./stdlib.dl": stdlibDL,
  "./highlight.dl": highlightDL,
  "./ast.dl": astDL,
  "./main.dl": mainDL,
});
