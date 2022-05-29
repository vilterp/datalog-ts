import { Res } from "../../../core/types";

export type RemovableNodeData = {
  res: Res;
  onClick: () => void;
};

export type RemovableEdgeData = {
  onClick: () => void;
};
