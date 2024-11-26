import { NodeChange, XYPosition } from "reactflow";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { fastPPT } from "../../../core/fastPPT";
import {
  Int,
  int,
  rec,
  Rec,
  Res,
  Statement,
  StringLit,
  Term,
} from "../../../core/types";
import { max } from "../../../util/util";
import { AttributeEditorSpec, TermEditorSpec } from "./types";

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
      pos: posToDL(change.position),
    },
  };
  return [
    { type: "Delete", record: baseRec },
    { type: "Fact", record: updatedRec },
  ];
}

export function deleteNodeAndConnectedEdges(
  interp: AbstractInterpreter,
  edgesQuery: Rec,
  res: Res
): Statement[] {
  const rec = res.term as Rec;
  const id = rec.attrs.id;
  const edges: Res[] = [
    ...interp.queryRec({
      ...edgesQuery,
      attrs: { ...edgesQuery.attrs, from: id },
    }),
    ...interp.queryRec({
      ...edgesQuery,
      attrs: { ...edgesQuery.attrs, to: id },
    }),
  ];
  return [
    { type: "Delete", record: getBaseRecord(res) },
    ...edges.map(
      (edgeRes): Statement => ({
        type: "Delete",
        record: getBaseRecord(edgeRes),
      })
    ),
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
export function getBaseRecord(res: Res): Rec {
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

export function getEditorSpecs(records: Rec[]): AttributeEditorSpec[] {
  return records.map((rec) => ({
    relation: (rec.attrs.relation as StringLit).val,
    attribute: (rec.attrs.attr as StringLit).val,
    editor: getTermEditorSpec(rec.attrs.editor as Rec),
  }));
}

function getTermEditorSpec(rec: Rec): TermEditorSpec {
  switch (rec.relation) {
    case "slider":
      return {
        type: "Slider",
        min: (rec.attrs.min as Int).val,
        max: (rec.attrs.max as Int).val,
      };
    default:
      throw new Error(`unknown editor type: ${rec.relation}`);
  }
}

export function getSpecForAttr(
  specs: AttributeEditorSpec[],
  relation: string,
  attr: string
): AttributeEditorSpec | undefined {
  return specs.find(
    (spec) => spec.attribute === attr && spec.relation === relation
  );
}

// I guess this only really works for Vegalite specs, doesn't it...
export function insertIDIntoSpec(spec: Rec, id: Term): Rec {
  return {
    ...spec,
    attrs: {
      ...spec.attrs,
      query: {
        ...(spec.attrs.query as Rec),
        attrs: {
          ...(spec.attrs.query as Rec).attrs,
          id,
        },
      },
    },
  };
}

export function dlToPos(rec: Rec): XYPosition {
  return {
    x: (rec.attrs.x as Int).val,
    y: (rec.attrs.y as Int).val,
  };
}

export function posToDL(pos: XYPosition): Rec {
  return rec("pos", {
    x: int(pos.x),
    y: int(pos.y),
  });
}
