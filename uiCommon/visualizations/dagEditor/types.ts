import { Res } from "../../../core/types";

export type AttributeEditorSpec = {
  relation: string;
  attribute: string;
  editor: TermEditorSpec;
};

export type TermEditorSpec = { type: "Slider"; min: number; max: number };

export type RemovableNodeData = {
  res: Res;
  editors: AttributeEditorSpec[];
  onClick: () => void;
};

export type RemovableEdgeData = {
  onClick: () => void;
};
