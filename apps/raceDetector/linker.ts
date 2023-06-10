import { Rec } from "../../core/types";
import {
  BBInstr,
  BBMain,
} from "../../languageWorkbench/languages/basicBlocks/parser";

export function linkBasicBlocks(tree: BBMain): Rec[] {
  const results: Rec[] = [];
  const blockIndex = getBlockIndex(tree);
  console.log("block index", blockIndex);
  // tree.children.forEach((child) => {
  //   XXXX;
  // });
  return results;
}

type BlockIndex = {
  [blockName: string]: { startIndex: number; instructions: BBInstr[] };
};

function getBlockIndex(tree: BBMain): BlockIndex {
  let idx = 0;
  const blockIndex: BlockIndex = {};
  tree.block.forEach((block) => {
    const name = block.label.text;
    const instructions = block.blockBody.instr;
    blockIndex[name] = { startIndex: idx, instructions };
    idx += instructions.length;
  });
  return blockIndex;
}
