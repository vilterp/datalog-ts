import React from "react";
import { fastPPT } from "../../core/fastPPT";
import { Rec, StringLit } from "../../core/types";
import { VizArgs, VizTypeSpec } from "./typeSpec";

// TODO: shouldn't the normal table just be an editor?
export const tableEditor: VizTypeSpec = {
  name: "Editor",
  description: "edit some records",
  component: TableEditor,
};

function TableEditor(props: VizArgs) {
  let error: string | null = null;
  let data: Rec[] = [];
  try {
    const recordsQuery = props.spec.attrs.records as Rec;
    data = props.interp.queryRec(recordsQuery).map((res) => res.term as Rec);
  } catch (e) {
    error = e.toString();
  }

  if (error) {
    return <pre style={{ color: "red" }}>{error}</pre>;
  }
  return (
    <ul>
      {data.map((rec) => (
        <li key={fastPPT(rec)}>{fastPPT(rec)}</li>
      ))}
    </ul>
  );
}
