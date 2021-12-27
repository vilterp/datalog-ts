import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit, Term } from "../../core/types";
import { VizTypeSpec } from "./typeSpec";
import { Graphviz } from "graphviz-react";
import { prettyPrintGraph } from "../../util/graphviz";

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
      const id = stringifyNodeID(res.bindings.ID);
      const label = res.bindings.Label
        ? stringifyNodeID(res.bindings.Label)
        : id;
      return {
        id,
        attrs: { label },
      };
    });
    const edgesQuery = (props.spec.attrs.edges as StringLit).val;
    const edgesRes = props.interp.queryStr(edgesQuery);
    const edges = edgesRes.map((res) => ({
      to: stringifyNodeID(res.bindings.To),
      from: stringifyNodeID(res.bindings.From),
      attrs: {
        label: res.bindings.Label ? stringifyNodeID(res.bindings.Label) : "",
      },
    }));

    const dot = prettyPrintGraph({
      nodes,
      edges,
    });

    return (
      <div>
        <Graphviz
          dot={dot}
          options={{ width: 500, height: 500, fit: true, zoom: false }}
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
