import { NodeChange } from "react-flow-renderer";
import { fastPPT } from "../../../core/fastPPT";
import { int, Rec, Statement } from "../../../core/types";
import { max } from "../../../util/util";

export function statementsForNodeChange(
  nodeRecords: Rec[],
  change: NodeChange
): Statement[] {
  if (change.type !== "position") {
    console.warn("change type not supported:", change);
    return [];
  }
  if (!change.position) {
    return [];
  }
  const rec = nodeRecords.find((rec) => change.id === fastPPT(rec.attrs.id));
  if (!rec) {
    throw new Error(`node not found for change ${change.id}`);
  }
  // TODO: helper function for record updates?
  const updatedRec: Rec = {
    ...rec,
    attrs: {
      ...rec.attrs,
      x: int(change.position.x),
      y: int(change.position.y),
    },
  };
  return [
    { type: "Delete", record: rec },
    { type: "Fact", record: updatedRec },
  ];
}

export function withID(existingRecs: Rec[], rec: Rec): Rec {
  const existingIDs = existingRecs.map((existing) => {
    const idAttr = existing.attrs.id;
    if (idAttr && idAttr.type === "IntLit") {
      return idAttr.val;
    }
    return 0;
  });
  const maxID = max(existingIDs);
  return {
    ...rec,
    attrs: {
      ...rec.attrs,
      id: int(maxID + 1),
    },
  };
}
