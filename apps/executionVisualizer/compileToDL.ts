import { Rec, Term, array, int, rec, str } from "../../core/types";
import {
  BBInstr,
  BBMain,
  BBRvalue,
} from "../../languageWorkbench/languages/basicBlocks/parser";
import { BlockIndex } from "./types";

export function compileBasicBlocksDL(tree: BBMain): Rec[] {
  const instrRecs: Rec[] = [];
  const paramRecs: Rec[] = [];
  const blockIndex = getBlockIndex(tree);
  blockIndex.blockOrder.forEach((blockName) => {
    const block = blockIndex.blocks[blockName];
    block.instructions.forEach((instr) => {
      const instrRec = instrToRec(instr, blockIndex);
      const idx = pushInstr(instrRecs, instrRec);
      // TODO: move this down into the instrToRValue somehow?
      if (instr.type === "ValueInstr" && instr.rvalue.type === "EditorVar") {
        paramRecs.push(
          rec("input.param", {
            instrIdx: int(idx),
            value: int(parseInt(instr.rvalue.int.text)),
          })
        );
      }
    });
  });
  return [...instrRecs, ...paramRecs];
}

export function instrToRec(instr: BBInstr, index: BlockIndex): Rec {
  switch (instr.type) {
    case "ValueInstr":
      return rec("store", {
        var: instr.ident ? str(instr.ident.text) : str("_"),
        val: rvalueToTerm(instr.rvalue),
      });
    case "GotoInstr": {
      if (!instr.label) {
        throw new Error("instr doesn't have label");
      }
      const dest = int(index.blocks[instr.label.text].startIndex);
      if (instr.ifClause) {
        return rec("gotoIf", {
          dest,
          cond: str(instr.ifClause.ident.text),
        });
      }
      return rec("goto", { dest });
    }
    case "ForkToInstr":
      return rec("forkTo", {
        dest: int(index.blocks[instr.label.text].startIndex),
      });
  }
}

function rvalueToTerm(expr: BBRvalue): Term {
  switch (expr.type) {
    case "Call": {
      if (expr.params && expr.params.Placeholder.length > 0) {
        throw new Error("expr still has placeholder");
      }
      const funName = expr.ident.text;
      const instr = funName.startsWith("prim.")
        ? "primitive"
        : funName.startsWith("block")
        ? "blockingCall"
        : "call";
      return rec(instr, {
        fun: str(funName),
        args: array(
          expr.params === null ? [] : expr.params.ident.map((x) => str(x.text))
        ),
      });
    }
    case "String":
      return str(JSON.parse(expr.text));
    case "Int":
      return int(parseInt(expr.text));
    case "EditorVar":
      return rec("param", {});
  }
}

export function getBlockIndex(tree: BBMain): BlockIndex {
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
  const idx = instrs.length;
  instrs.push(
    rec("input.instr", {
      idx: int(idx),
      op,
    })
  );
  return idx;
}
