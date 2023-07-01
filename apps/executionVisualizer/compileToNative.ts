import { Rec } from "../../core/types";
import {
  BBInstr,
  BBMain,
} from "../../languageWorkbench/languages/basicBlocks/parser";
import { getBlockIndex, instrToRec } from "./compileToDL";
import { BlockIndex } from "./types";

export type Program = {
  instrs: BBInstr[];
  dlInstrs: Rec[];
  blockIndex: BlockIndex;
  params: { [id: string]: { defaultValue: number } };
};

export function compileBasicBlocksNative(tree: BBMain): Program {
  const blockIndex = getBlockIndex(tree);
  const instrs: BBInstr[] = [];
  const params: { [id: string]: { defaultValue: number } } = {};
  blockIndex.blockOrder.forEach((blockName) => {
    const block = blockIndex.blocks[blockName];
    block.instructions.forEach((instr) => {
      const idx = pushInstr(instrs, instr);
      // TODO: move this down into the instrToRValue somehow?
      if (instr.type === "ValueInstr" && instr.rvalue.type === "EditorVar") {
        params[instr.ident.text] = {
          defaultValue: parseInt(instr.rvalue.int.text),
        };
      }
    });
  });
  const dlInstrs = instrs.map((instr) => instrToRec(instr, blockIndex));
  return { blockIndex, instrs, params, dlInstrs };
}

function pushInstr(instrs: BBInstr[], instr: BBInstr) {
  const idx = instrs.length;
  instrs.push(instr);
  return idx;
}
