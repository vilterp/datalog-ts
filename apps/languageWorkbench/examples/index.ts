// DL

// @ts-ignore
import datalogDL from "./dl/datalog.dl";
// @ts-ignore
import datalogGrammar from "./dl/datalog.grammar";
// @ts-ignore
import datalogExample from "./dl/example.txt";

// JSON

// @ts-ignore
import jsonDL from "./json/json.dl";
// @ts-ignore
import jsonGrammar from "./json/json.grammar";
// @ts-ignore
import jsonExample from "./json/example.txt";

// basic blocks

// @ts-ignore
import basicBlocksDL from "./basicBlocks/basicBlocks.dl";
// @ts-ignore
import basicBlocksGrammar from "./basicBlocks/basicBlocks.grammar";
// @ts-ignore
import basicBlocksExample from "./basicBlocks/example.txt";

// grammar

// @ts-ignore
import grammarDL from "./grammar/grammar.dl";
// @ts-ignore
import grammarGrammar from "./grammar/grammar.grammar";
// @ts-ignore
import grammarExample from "./grammar/example.txt";

// fp

// @ts-ignore
import fpDL from "./fp/fp.dl";
// @ts-ignore
import fpGrammar from "./fp/fp.grammar";
// @ts-ignore
import fpExample from "./fp/example.txt";

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
  grammar: {
    datalog: grammarDL,
    grammar: grammarGrammar,
    example: grammarExample,
  },
  fp: {
    datalog: fpDL,
    example: fpExample,
    grammar: fpGrammar,
  },
};

type LanguageSpec = {
  datalog: string;
  grammar: string;
  example: string;
};
