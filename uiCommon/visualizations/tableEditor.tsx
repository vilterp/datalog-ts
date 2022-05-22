import React from "react";
import { ppt } from "../../core/pretty";
import { Array, Rec } from "../../core/types";
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
  let news: Rec[] = [];
  let newsError: string | null = null;
  try {
    news = (props.spec.attrs.new as Array).items.map((item) => item as Rec);
  } catch (e) {
    newsError = e.toString();
  }

  return (
    <>
      Data
      <ul>
        {data.map((rec) => (
          <li key={ppt(rec)}>
            <pre>{ppt(rec)}</pre>
          </li>
        ))}
      </ul>
      Create new:
      <ul>
        {news.map((newRec) => (
          <li key={ppt(newRec)}>
            <button>{ppt(newRec)}</button>
          </li>
        ))}
      </ul>
    </>
  );
}
