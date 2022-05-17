import * as fs from "fs";
import { parseGrammar } from "../meta";
import { genExtractorStr } from "./genExtractor";

type Args = {
  grammarPath: string;
  outputPath: string;
};

function main() {
  const args: Args = {
    grammarPath: process.argv[2],
    outputPath: process.argv[3],
  };
  console.log("generating with args", args);
  generate(args);
}

function generate(args: Args) {
  const grammarStr = fs.readFileSync(args.grammarPath, "utf-8");
  const grammar = parseGrammar(grammarStr);
  const code = genExtractorStr(grammar);
  fs.writeFileSync(args.outputPath, code);
}

main();
