// DL

// @ts-ignore
import datalogCSS from "./dl/theme.css";
// @ts-ignore
import datalogDL from "./dl/highlight.dl";
// @ts-ignore
import datalogGrammar from "./dl/datalog.grammar";

// JSON

// @ts-ignore
import jsonCSS from "./json/theme.css";
// @ts-ignore
import jsonDL from "./json/highlight.dl";
// @ts-ignore
import jsonGrammar from "./json/json.grammar";

// basic blocks

// @ts-ignore
import basicBlocksCSS from "./basicBlocks/theme.css";
// @ts-ignore
import basicBlocksDL from "./basicBlocks/highlight.dl";
// @ts-ignore
import basicBlocksGrammar from "./basicBlocks/basicBlocks.grammar";

export const EXAMPLES: { [name: string]: LanguageSpec } = {
  datalog: {
    themeCSS: datalogCSS,
    datalog: datalogDL,
    grammar: datalogGrammar,
  },
  json: {
    themeCSS: jsonCSS,
    datalog: jsonDL,
    grammar: jsonGrammar,
  },
  basicBlocks: {
    themeCSS: basicBlocksCSS,
    datalog: basicBlocksDL,
    grammar: basicBlocksGrammar,
  },
};

type LanguageSpec = {
  themeCSS: string;
  datalog: string;
  grammar: string;
};
