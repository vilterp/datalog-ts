// DL

// @ts-ignore
import datalogCSS from "./dl/theme.css";
// @ts-ignore
import datalogDL from "./dl/highlight.dl";
// @ts-ignore
import datalogGrammar from "./dl/datalog.grammar";
// @ts-ignore
import datalogExample from "./dl/example.txt";

// JSON

// @ts-ignore
import jsonCSS from "./json/theme.css";
// @ts-ignore
import jsonDL from "./json/highlight.dl";
// @ts-ignore
import jsonGrammar from "./json/json.grammar";
// @ts-ignore
import jsonExample from "./json/example.txt";

// basic blocks

// @ts-ignore
import basicBlocksCSS from "./basicBlocks/theme.css";
// @ts-ignore
import basicBlocksDL from "./basicBlocks/highlight.dl";
// @ts-ignore
import basicBlocksGrammar from "./basicBlocks/basicBlocks.grammar";
// @ts-ignore
import basicBlocksExample from "./basicBlocks/example.txt";

export const EXAMPLES: { [name: string]: LanguageSpec } = {
  datalog: {
    themeCSS: datalogCSS,
    datalog: datalogDL,
    grammar: datalogGrammar,
    example: datalogExample,
  },
  json: {
    themeCSS: jsonCSS,
    datalog: jsonDL,
    grammar: jsonGrammar,
    example: jsonExample,
  },
  basicBlocks: {
    themeCSS: basicBlocksCSS,
    datalog: basicBlocksDL,
    grammar: basicBlocksGrammar,
    example: basicBlocksExample,
  },
};

type LanguageSpec = {
  themeCSS: string;
  datalog: string;
  grammar: string;
  example: string;
};
