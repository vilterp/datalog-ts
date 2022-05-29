import { NodeChange } from "react-flow-renderer";
import { fastPPT } from "../../../core/fastPPT";
import { int, Rec, Res, Statement } from "../../../core/types";
import { max } from "../../../util/util";

export function statementsForNodeChange(
  nodeResults: Res[],
  change: NodeChange
): Statement[] {
  if (change.type !== "position") {
    console.warn("change type not supported:", change);
    return [];
  }
  if (!change.position) {
    return [];
  }
  const res = nodeResults.find(
    (res) => change.id === fastPPT((res.term as Rec).attrs.id)
  );
  if (!res) {
    throw new Error(`node not found for change ${change.id}`);
  }
  const baseRec = getBaseRecord(res);
  // TODO: helper function for record updates?
  const updatedRec: Rec = {
    ...baseRec,
    attrs: {
      ...baseRec.attrs,
      x: int(change.position.x),
      y: int(change.position.y),
    },
  };
  return [
    { type: "Delete", record: baseRec },
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

// TODO: extract this to a more generic place
function getBaseRecord(res: Res): Rec {
  switch (res.trace.type) {
    case "AndTrace": {
      const length = res.trace.sources.length;
      if (length !== 1) {
        throw new Error(
          `can only get base record when and trace has 1 source; got ${length}`
        );
      }
      return getBaseRecord(res.trace.sources[1]);
    }
    case "MatchTrace": {
      return getBaseRecord(res.trace.fact);
    }
    case "BaseFactTrace":
      return res.term as Rec;
    case "RefTrace":
      return getBaseRecord(res.trace.innerRes);
    default:
      throw new Error(`not supported: ${res.trace.type}`);
  }
}
