import { Rec, int, rec, str } from "../../core/types";
import {
  BBInstr,
  BBMain,
} from "../../languageWorkbench/languages/basicBlocks/parser";

type BlockIndex = {
  [blockName: string]: { startIndex: number; instructions: BBInstr[] };
};

export function linkBasicBlocks(tree: BBMain): Rec[] {
  const results: Rec[] = [];
  const blockIndex = getBlockIndex(tree);
  Object.entries(blockIndex).forEach(([name, block]) => {
    block.instructions.forEach((instr, idx) => {
      results.push(
        rec("instr", {
          idx: int(block.startIndex + idx),
          op: instrToRec(instr, blockIndex),
        })
      );
    });
  });
  return results;
}

function instrToRec(instr: BBInstr, index: BlockIndex): Rec {
  switch (instr.type) {
    case "ValueInstr":
      return rec("store", {
        var: str(instr.ident.text),
      });
    case "GotoInstr": {
      if (!instr.label) {
        throw new Error("instr doesn't have label");
      }
      return rec("goto", { dest: int(index[instr.label.text].startIndex) });
    }
  }
}

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
