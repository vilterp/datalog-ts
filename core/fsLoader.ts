// split into its own file so we don't try importing fs when we're in the browser
import { Loader } from "./loaders";
import * as fs from "fs";

export const fsLoader: Loader = (path) => fs.readFileSync(path).toString();
