import {
  BBInstr,
  BBMain,
} from "../../languageWorkbench/languages/basicBlocks/parser";
import { getBlockIndex } from "./compileToDL";
import { BlockIndex } from "./types";

export type Program = {
  instrs: BBInstr[];
  blockIndex: BlockIndex;
  params: { [id: string]: { defaultValue: number } };
};

export function compileBasicBlocks(tree: BBMain): Program {
  const blockIndex = getBlockIndex(tree);
  const instrs: BBInstr[] = [];
  const params: { [id: string]: { defaultValue: number } } = {};
  blockIndex.blockOrder.forEach((blockName) => {
    const block = blockIndex.blocks[blockName];
    block.instructions.forEach((instr) => {
      const idx = pushInstr(instrs, instr);
      // TODO: move this down into the instrToRValue somehow?
      if (instr.type === "ValueInstr" && instr.rvalue.type === "EditorVar") {
        params[idx] = {
          defaultValue: parseInt(instr.rvalue.int.text),
        };
      }
    });
  });
  return { blockIndex, instrs, params };
}

function pushInstr(instrs: BBInstr[], instr: BBInstr) {
  const idx = instrs.length;
  instrs.push(instr);
  return idx;
}
