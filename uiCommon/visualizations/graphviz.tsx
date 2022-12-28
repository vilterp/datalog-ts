import React from "react";
import { Rec, StringLit, Term } from "../../core/types";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { Graphviz } from "graphviz-react";
import { prettyPrintGraph, Node, Edge } from "../../util/graphviz";
import { ppt } from "../../core/pretty";

export const graphviz: VizTypeSpec = {
  name: "Graphviz",
  description: "visualize directed graphs",
  component: GraphvizWrapper,
};

function GraphvizWrapper(props: VizArgs) {
  // TODO: better error messages when bindings are missing
  // in theory this could be found statically...

  // TODO: node attrs, edge attrs

  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let nodesErr: Error = null;
  let edgesErr: Error = null;
  // nodes
  try {
    const nodesQuery = props.spec.attrs.nodes as Rec;
    const nodesRes = props.interp.queryRec(nodesQuery);
    nodes = nodesRes.map((res) => {
      const id = specialPPT(res.bindings.ID);
      const label = res.bindings.Label ? specialPPT(res.bindings.Label) : id;
      return {
        id,
        attrs: { label, shape: "rect", fontname: "Courier New" },
      };
    });
  } catch (e) {
    console.error("nodes", e);
    nodesErr = e;
  }

  // edges
  try {
    const edgesQuery = props.spec.attrs.edges as Rec;
    const edgesRes = props.interp.queryRec(edgesQuery);
    edges = edgesRes.map((res) => ({
      to: specialPPT(res.bindings.To),
      from: specialPPT(res.bindings.From),
      attrs: {
        label: res.bindings.Label ? specialPPT(res.bindings.Label) : "",
      },
    }));
  } catch (e) {
    edgesErr = e;
    console.error("edges", e);
  }

  const dot = prettyPrintGraph({
    nodes,
    edges,
  });

  const errors = {
    edges: edgesErr,
    nodes: nodesErr,
  };
  const errorPairs = Object.entries(errors).filter(
    ([key, value]) => value !== null
  );

  return (
    <div>
      {errorPairs.length === 0 ? null : (
        <pre style={{ color: "red" }}>
          <ul>
            {errorPairs.map(([key, value]) => (
              <li key={key}>
                Error getting {key}: {value.toString()}
              </li>
            ))}
          </ul>
        </pre>
      )}
      <MemoizedGraphviz dot={dot} options={GRAPHVIZ_OPTIONS} />
    </div>
  );
}

// don't love special cases, but all the quotes are annoying
function specialPPT(term: Term) {
  switch (term.type) {
    case "StringLit":
      return term.val;
    default:
      return ppt(term);
  }
}

const MemoizedGraphviz = React.memo(Graphviz);

// pull out this object to avoid creating it each time,
// which defeats React.memo (and allocates unnecessarily...)
const GRAPHVIZ_OPTIONS = { width: 500, height: 300, fit: true, zoom: false };
