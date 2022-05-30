import { Rec, Res, Term } from "../../../core/types";

export type AttributeEditorSpec = {
  relation: string;
  attribute: string;
  editor: TermEditorSpec;
};

export type TermEditorSpec = SliderSpec;

export type SliderSpec = { type: "Slider"; min: number; max: number };

export type NodeVisualizationSpec = {
  relation: string;
  vizSpec: Rec;
};

export type EditorNodeData = {
  res: Res;
  editors: AttributeEditorSpec[];
  nodeVizSpecs: NodeVisualizationSpec[];
  onDelete: () => void;
  onChange: (newTerm: Term) => void;
};

export type RemovableEdgeData = {
  onClick: () => void;
};
