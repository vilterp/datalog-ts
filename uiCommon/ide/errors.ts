import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Int, int } from "../../core/types";
import { Span, dlToSpan } from "./types";
import { mapTree, filterTree, getLeaves } from "../../util/tree";
import { treeFromRecords } from "../generic/treeFromRecords";

// just `TypeError` is a builtin
export type DLTypeError = {
  exprID: number;
  span: Span;
};

export function getTypeErrors(interp: AbstractInterpreter): DLTypeError[] {
  const exprTreeRecs = interp.queryStr(
    "ast.ParentExpr{id: ID, parent: ParentID}"
  );
  // TODO: move treeFromRecords somewhere common, not visualizations...
  const exprTree = treeFromRecords(exprTreeRecs, int(0));
  const exprIDsWithTypes = new Set(
    interp
      .queryStr("tc.Type{id: I}")
      .map((res) => ((res.term as Rec).attrs.id as Int).val)
  );
  const exprErrorTree = mapTree(exprTree, (res) => {
    if (!res) {
      return null;
    }
    const rec = res.term as Rec;
    const exprID = (rec.attrs.id as Int).val;
    return {
      exprID,
      span: dlToSpan(rec.attrs.span as Rec),
      error: !exprIDsWithTypes.has(exprID),
    };
  });

  const filtered = filterTree(exprErrorTree, (node) => node && node.error);

  const leaves = getLeaves(filtered);

  // TODO: remove necessity for filter... root expr as null keeps throwing things off
  return leaves.filter((l) => !!l).sort((a, b) => a.span.from - b.span.from);
}

// type ContainmentNode = { id: number; span: Span; children: ContainmentNode[] };

// export function getSmallestErrors(errors: DLTypeError[]): DLTypeError[] {
//   return XXX;
// }

// function buildContainmentTree(): ContainmentTree {}
