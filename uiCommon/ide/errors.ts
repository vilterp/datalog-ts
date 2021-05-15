import { AbstractInterpreter } from "../../core/abstractinterpreter";
import { Rec, Int } from "../../core/types";
import { Span, dlToSpan } from "./types";
import { treeFromRecords } from "../visualizations/tree";
import { mapTree, filterTree, getLeaves } from "../../util/tree";

// just `TypeError` is a builtin
export type DLTypeError = {
  exprID: number;
  span: Span;
};

export function getTypeErrors(interp: AbstractInterpreter): DLTypeError[] {
  const exprTreeRecs = interp
    .queryStr("ast.ParentExpr{child: C, parent: P}")
    .map((res) => res.term as Rec);
  const exprTree = treeFromRecords(exprTreeRecs, "0");
  const exprIDsWithTypes = new Set(
    interp
      .queryStr("tc.Type{id: I}")
      .map((res) => ((res.term as Rec).attrs.id as Int).val)
  );
  const exprErrorTree = mapTree(exprTree, (rec) => {
    if (!rec) {
      return null;
    }
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
