import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit, Term } from "../../core/types";
import { VizTypeSpec } from "./typeSpec";
import { Graphviz } from "graphviz-react";
import { prettyPrintGraph } from "../../util/graphviz";
import { ppt } from "../../core/pretty";

/*
Example:

internal.visualization{
  name: "Scope Graph",
  spec: graphviz{
    nodes: "node{id: ID}",
    edges: "edge{from: From, to: To, label: Label}"
  }
}.
*/

export const graphviz: VizTypeSpec = {
  name: "Graphviz",
  description: "visualize directed graphs",
  component: GraphvizWrapper,
};

function GraphvizWrapper(props: {
  interp: AbstractInterpreter;
  spec: Rec;
  setHighlightedTerm: (t: Term | null) => void;
}) {
  try {
    // TODO: better error messages when bindings are missing
    const nodesQuery = (props.spec.attrs.nodes as StringLit).val;
    const nodesRes = props.interp.queryStr(nodesQuery);
    const nodes = nodesRes.map((res) => {
      const id = ppt(res.bindings.ID);
      const label = res.bindings.Label ? ppt(res.bindings.Label) : id;
      return {
        id,
        attrs: { label },
      };
    });
    const edgesQuery = (props.spec.attrs.edges as StringLit).val;
    const edgesRes = props.interp.queryStr(edgesQuery);
    const edges = edgesRes.map((res) => ({
      to: ppt(res.bindings.To),
      from: ppt(res.bindings.From),
      attrs: {
        label: res.bindings.Label ? ppt(res.bindings.Label) : "",
      },
    }));

    const dot = prettyPrintGraph({
      nodes,
      edges,
    });

    return (
      <div>
        <MemoizedGraphviz dot={dot} options={GRAPHVIZ_OPTIONS} />
      </div>
    );
  } catch (e) {
    console.error(e);
    return <pre style={{ color: "red" }}>{e.toString()}</pre>;
  }
}

const MemoizedGraphviz = React.memo(Graphviz);

// pull out this object to avoid creating it each time,
// which defeats React.memo (and allocates unnecessarily...)
const GRAPHVIZ_OPTIONS = { width: 500, height: 500, fit: true, zoom: false };
