import * as fs from "fs";
import { parseMain } from "../../languages/grammar/parser";
import { parserGrammarToInternal } from "../translateAST";
import { generateTableDecls } from "./generate";
import { prettyPrintTableDecl } from "../../languages/dl2/compiler/pretty";

type Args = {
  grammarPath: string;
  // outputPath: string;
};

function main() {
  // TODO: use some kind of actual option parser. optimist?
  const args: Args = {
    grammarPath: process.argv[2],
    // outputPath: process.argv[3],
  };
  console.log("generating with args", args);
  generate(args);
}

function generate(args: Args) {
  const grammarStr = fs.readFileSync(args.grammarPath, "utf-8");
  const [grammarTree, errors] = parseMain(grammarStr);
  if (errors.length > 0) {
    console.log("failed to parse grammar:");
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }
  const grammar = parserGrammarToInternal(grammarTree);
  const tableDecls = generateTableDecls(grammar);
  const code = Object.entries(tableDecls)
    .map(([name, decl]) => prettyPrintTableDecl(name, decl))
    .join("\n\n");
  // fs.writeFileSync(args.outputPath, code);
  console.log(code);
}

main();
