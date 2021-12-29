import { TreeCollapseState } from "../generic/treeView";

export type TableCollapseState = {
  [key: string]: TreeCollapseState;
};

export type RelationCollapseStates = { [key: string]: TableCollapseState };
