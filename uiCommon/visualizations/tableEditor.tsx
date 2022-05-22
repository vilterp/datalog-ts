import React from "react";
import { ppt } from "../../core/pretty";
import { Rec } from "../../core/types";
import { VizArgs, VizTypeSpec } from "./typeSpec";

// TODO: shouldn't the normal table just be an editor?
export const tableEditor: VizTypeSpec = {
  name: "Editor",
  description: "edit some records",
  component: TableEditor,
};

function TableEditor(props: VizArgs) {
  // get data
  let dataError: string | null = null;
  let data: Rec[] = [];
  try {
    const recordsQuery = props.spec.attrs.query as Rec;
    data = props.interp.queryRec(recordsQuery).map((res) => res.term as Rec);
  } catch (e) {
    dataError = e.toString();
  }
  if (dataError) {
    return <pre style={{ color: "red" }}>getting data: {dataError}</pre>;
  }

  // get news

  return (
    <ul>
      {data.map((rec) => (
        <li key={ppt(rec)}>
          <pre>{ppt(rec)}</pre>
        </li>
      ))}
    </ul>
  );
}
