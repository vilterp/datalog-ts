import { Rec, Term, array, int, rec, str } from "../../core/types";
import {
  BBInstr,
  BBMain,
  BBRvalue,
} from "../../languageWorkbench/languages/basicBlocks/parser";

type BlockIndex = {
  blockOrder: string[];
  blocks: {
    [blockName: string]: { startIndex: number; instructions: BBInstr[] };
  };
};

export function compileBasicBlocks(tree: BBMain): Rec[] {
  const results: Rec[] = [];
  const blockIndex = getBlockIndex(tree);
  blockIndex.blockOrder.forEach((blockName) => {
    const block = blockIndex.blocks[blockName];
    block.instructions.forEach((instr) => {
      pushInstr(results, instrToRec(instr, blockIndex));
    });
  });
  return results;
}

function instrToRec(instr: BBInstr, index: BlockIndex): Rec {
  switch (instr.type) {
    case "ValueInstr":
      return rec("store", {
        var: str(instr.ident.text),
        val: rvalueToTerm(instr.rvalue),
      });
    case "GotoInstr": {
      if (!instr.label) {
        throw new Error("instr doesn't have label");
      }
      const attrs: { [k: string]: Term } = {
        dest: int(index.blocks[instr.label.text].startIndex),
      };
      if (instr.ifClause) {
        attrs.if = str(instr.ifClause.ident.text);
      }
      return rec("goto", attrs);
    }
  }
}

function rvalueToTerm(expr: BBRvalue): Term {
  switch (expr.type) {
    case "Call":
      if (expr.params && expr.params.Placeholder.length > 0) {
        throw new Error("expr still has placeholder");
      }
      return rec("call", {
        fun: str(expr.ident.text),
        args: array(
          expr.params === null ? [] : expr.params.ident.map((x) => str(x.text))
        ),
      });
    case "String":
      return str(JSON.parse(expr.text));
    case "Int":
      return int(parseInt(expr.text));
  }
}

function getBlockIndex(tree: BBMain): BlockIndex {
  let idx = 0;
  const blockIndex: BlockIndex = { blocks: {}, blockOrder: [] };
  tree.block.forEach((block) => {
    const name = block.label.text;
    const instructions = block.blockBody.instr;
    blockIndex.blocks[name] = { startIndex: idx, instructions };
    blockIndex.blockOrder.push(name);
    idx += instructions.length;
  });
  return blockIndex;
}

function pushInstr(instrs: Rec[], op: Rec) {
  instrs.push(
    rec("instr", {
      idx: int(instrs.length),
      op,
    })
  );
}
