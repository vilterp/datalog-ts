import { Rule } from "../../core/types";
import { TreeCollapseState } from "../generic/treeView";

export type TableCollapseState = {
  [key: string]: TreeCollapseState;
};

export type RelationStatus =
  | { type: "Count"; count: number }
  | { type: "Error" };

export type RelationInfo =
  | { type: "Table"; name: string; status: RelationStatus }
  | { type: "Rule"; name: string; rule: Rule; status: RelationStatus };

export type RelationCollapseStates = { [key: string]: TableCollapseState };
