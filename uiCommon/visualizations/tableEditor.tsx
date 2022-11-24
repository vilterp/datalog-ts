import React from "react";
import { ppt } from "../../core/pretty";
import { Array, int, Rec } from "../../core/types";
import { max } from "../../util/util";
import { BareTerm } from "../dl/replViews";
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
        {data.map((record) => (
          <li key={ppt(record)}>
            <button
              onClick={() => {
                props.runStatements([{ type: "Delete", record: record }]);
              }}
            >
              x
            </button>{" "}
            <BareTerm term={record} />
          </li>
        ))}
      </ul>
      Create new:
      <ul>
        {news.map((newRec) => (
          <li key={ppt(newRec)}>
            <button
              onClick={() => {
                props.runStatements([
                  { type: "Fact", record: withID(data, newRec) },
                ]);
              }}
            >
              {ppt(newRec)}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function withID(existingRecs: Rec[], rec: Rec): Rec {
  const ids = existingRecs.map((existing) => {
    const label = existing.attrs.label as Rec;
    const idAttr = label.attrs.id;
    if (idAttr && idAttr.type === "IntLit") {
      return idAttr.val;
    }
    return 0;
  });
  const maxID = max(ids);
  return {
    ...rec,
    attrs: {
      ...rec.attrs,
      id: int(maxID + 1),
    },
  };
}
