import React from "react";
import { Rec, StringLit, Term } from "../../core/types";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { Graphviz } from "graphviz-react";
import { prettyPrintGraph, Node, Edge } from "../../util/graphviz";
import { ppt } from "../../core/pretty";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

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
    nodes = props.spec.attrs.nodes ? getNodes(props.interp, props.spec) : [];
  } catch (e) {
    console.error("nodes", e);
    nodesErr = e;
  }

  // edges
  try {
    edges = props.spec.attrs.edges ? getEdges(props.interp, props.spec) : [];
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

function getNodes(interp: AbstractInterpreter, spec: Rec): Node[] {
  const nodesQuery = spec.attrs.nodes as Rec;
  const nodesRes = interp.queryRec(nodesQuery);
  return nodesRes.map((res) => {
    const id = specialPPT(res.bindings.ID);
    const label = res.bindings.Label ? specialPPT(res.bindings.Label) : id;
    return {
      id,
      attrs: { label, shape: "rect", fontname: "Courier New" },
    };
  });
}

function getEdges(interp: AbstractInterpreter, spec: Rec): Edge[] {
  const edgesQuery = spec.attrs.edges as Rec;
  const edgesRes = interp.queryRec(edgesQuery);
  return edgesRes.map((res) => ({
    to: specialPPT(res.bindings.To),
    from: specialPPT(res.bindings.From),
    attrs: {
      label: res.bindings.Label ? specialPPT(res.bindings.Label) : "",
    },
  }));
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
