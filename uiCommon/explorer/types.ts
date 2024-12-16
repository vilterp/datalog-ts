import { Relation, Rule } from "../../core/types";
import { TreeCollapseState } from "../generic/treeView";

export type TableCollapseState = {
  [key: string]: TreeCollapseState;
};

export const emptyTableCollapseState: TableCollapseState = {};

export type RelationStatus =
  | { type: "Count"; count: number }
  | { type: "Error" };

export type RelationWithStatus = { relation: Relation; status: RelationStatus };

export type RelationCollapseStates = { [key: string]: TableCollapseState };

export type Action = { type: "EditRule"; newRule: Rule };
