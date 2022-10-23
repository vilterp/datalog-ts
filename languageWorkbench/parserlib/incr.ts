import { TraceTree } from "./parser";

type Input = { type: "Insert"; position: number; text: string };

export function step(tree: TraceTree, input: Input): TraceTree {
  return recur(tree, input, 0);
}

function recur(tree: TraceTree, input: Input, pos: number): TraceTree {
  switch (tree.type) {
    case "ChoiceTrace":
      return XXX;
    case "RefTrace":
      return XXXX;
    case "RepSepTrace":
      return XXXX;
    case "SeqTrace":
      return XXXX;
    case "SucceedTrace":
      return XXX;
    case "TextTrace":
      return XXX;
    case "CharTrace":
      return XXX;
  }
}
