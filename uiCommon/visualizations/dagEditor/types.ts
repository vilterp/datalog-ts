import { Rec, Res, Value } from "../../../core/types";
import { VizArgs } from "../typeSpec";

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
  // specific to this node
  res: Res;
  editors: AttributeEditorSpec[];
  nodeVizSpecs: NodeVisualizationSpec[];
  onDelete: () => void;
  onChange: (newTerm: Value) => void;
  // for embedding visualizations
  overallSpec: VizArgs;
};

export type RemovableEdgeData = {
  onClick: () => void;
};
