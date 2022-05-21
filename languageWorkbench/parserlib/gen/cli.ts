import * as fs from "fs";
import { parseGrammar } from "../meta";
import { genExtractorStr, Options } from "./generate";

type Args = {
  grammarPath: string;
  outputPath: string;
  parserlibPath: string;
  typePrefix: string;
  ignoreRules: string[];
};

function main() {
  // TODO: use some kind of actual option parser. optimist?
  const args: Args = {
    grammarPath: process.argv[2],
    outputPath: process.argv[3],
    parserlibPath: process.argv[4],
    typePrefix: process.argv[5],
    ignoreRules: process.argv[6].split(","),
  };
  console.log("generating with args", args);
  generate(args);
}

function generate(args: Args) {
  const grammarStr = fs.readFileSync(args.grammarPath, "utf-8");
  const grammar = parseGrammar(grammarStr);
  const options: Options = {
    parserlibPath: args.parserlibPath,
    typePrefix: args.typePrefix,
    ignoreRules: new Set(args.ignoreRules),
  };
  const code = genExtractorStr(options, grammar);
  fs.writeFileSync(args.outputPath, code);
}

main();
