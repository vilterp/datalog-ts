import { Rec } from "../../core/types";
import { RuleTree } from "../../languageWorkbench/parserlib/ruleTree";

export function linkBasicBlocks(text: string, tree: RuleTree): Rec[] {
  const results: Rec[] = [];
  const blockIndex = getBlockIndex(text, tree);
  console.log("block index", blockIndex);
  // tree.children.forEach((child) => {
  //   XXXX;
  // });
  return results;
}

type BlockIndex = {
  [blockName: string]: { startIndex: number; instructions: RuleTree[] };
};

function getBlockIndex(text: string, tree: RuleTree): BlockIndex {
  let idx = 0;
  const blockIndex: BlockIndex = {};
  tree.children.forEach((child) => {
    if (child.name !== "block") {
      return;
    }
    const nameNode = child.children.filter((c) => c.name === "label")[0];
    const name = text.substring(nameNode.span.from, nameNode.span.to);
    const instructions = child.children
      .filter((c) => c.name === "blockBody")[0]
      .children.filter((c) => c.name === "instr");
    blockIndex[name] = { startIndex: idx, instructions };
    idx += instructions.length;
  });
  return blockIndex;
}
