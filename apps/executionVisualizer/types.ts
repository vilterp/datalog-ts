import { BBInstr } from "../../languageWorkbench/languages/basicBlocks/parser";

export type BlockIndex = {
  blockOrder: string[];
  blocks: {
    [blockName: string]: { startIndex: number; instructions: BBInstr[] };
  };
};
