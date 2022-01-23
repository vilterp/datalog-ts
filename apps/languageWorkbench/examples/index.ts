// DL

// @ts-ignore
import datalogDL from "./dl/language.dl";
// @ts-ignore
import datalogGrammar from "./dl/datalog.grammar";
// @ts-ignore
import datalogExample from "./dl/example.txt";

// JSON

// @ts-ignore
import jsonDL from "./json/language.dl";
// @ts-ignore
import jsonGrammar from "./json/json.grammar";
// @ts-ignore
import jsonExample from "./json/example.txt";

// basic blocks

// @ts-ignore
import basicBlocksDL from "./basicBlocks/language.dl";
// @ts-ignore
import basicBlocksGrammar from "./basicBlocks/basicBlocks.grammar";
// @ts-ignore
import basicBlocksExample from "./basicBlocks/example.txt";

export const EXAMPLES: { [name: string]: LanguageSpec } = {
  datalog: {
    datalog: datalogDL,
    grammar: datalogGrammar,
    example: datalogExample,
  },
  json: {
    datalog: jsonDL,
    grammar: jsonGrammar,
    example: jsonExample,
  },
  basicBlocks: {
    datalog: basicBlocksDL,
    grammar: basicBlocksGrammar,
    example: basicBlocksExample,
  },
};

type LanguageSpec = {
  datalog: string;
  grammar: string;
  example: string;
};
