import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit, Term } from "../../core/types";
import { VizTypeSpec } from "./typeSpec";
import Digraph from "@jaegertracing/plexus/lib/DirectedGraph";
import { LayoutManager } from "@jaegertracing/plexus";

export const graphviz: VizTypeSpec = {
  name: "Graphviz",
  description: "visualize directed graphs",
  component: Graphviz,
};

const lm = new LayoutManager({
  useDotEdges: true,
  rankdir: "TB",
  ranksep: 1.1,
});

function Graphviz(props: {
  interp: AbstractInterpreter;
  spec: Rec;
  setHighlightedTerm: (t: Term | null) => void;
}) {
  try {
    // TODO: better error messages when bindings are missing
    const nodesQuery = (props.spec.attrs.nodes as StringLit).val;
    const nodesRes = props.interp.queryStr(nodesQuery);
    console.log({ nodesRes });
    const nodes = nodesRes.map((res) => {
      const id = stringifyNodeID(res.bindings.ID);
      const label = res.bindings.Label
        ? stringifyNodeID(res.bindings.Label)
        : id;
      return {
        key: id,
        label: label,
      };
    });
    const edgesQuery = (props.spec.attrs.edges as StringLit).val;
    const edgesRes = props.interp.queryStr(edgesQuery);
    console.log({ edgesRes });
    const edges = edgesRes.map((res) => ({
      to: stringifyNodeID(res.bindings.To),
      from: stringifyNodeID(res.bindings.From),
      label: res.bindings.Label ? stringifyNodeID(res.bindings.Label) : "",
    }));

    return (
      <div>
        <Digraph
          zoom={true}
          edges={edges}
          vertices={nodes}
          layoutManager={lm}
        />
      </div>
    );
  } catch (e) {
    console.error(e);
    return (
      <pre style={{ fontFamily: "monospace", color: "red" }}>
        {e.toString()}
      </pre>
    );
  }
}

function stringifyNodeID(term: Term): string {
  if (term.type === "StringLit") {
    return term.val;
  }
  if (term.type === "IntLit") {
    return term.val.toString();
  }
  throw new Error(`expected int or string, got "${JSON.stringify(term)}"`);
}
