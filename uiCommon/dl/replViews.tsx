import React, { useState } from "react";
import { Res, Value } from "../../core/types";
import { noHighlightProps, Highlight, HighlightProps, TermView } from "./term";
import { TreeCollapseState } from "../generic/treeView";
import { TraceTreeView } from "./trace";
import { makeTermWithBindings } from "../../core/termWithBindings";

export function IndependentTraceView(props: { res: Res }) {
  const [collapseState, setCollapseState] = useState<TreeCollapseState>({
    collapsed: true,
    childStates: {},
  });
  const [highlight, setHighlight] = useState<Highlight>({ type: "None" });
  const hlProps: HighlightProps = {
    highlight,
    setHighlight,
    childPaths: [],
    parentPaths: [],
  };
  return (
    <TraceTreeView
      collapseState={collapseState}
      setCollapseState={setCollapseState}
      highlight={hlProps}
      result={props.res}
    />
  );
}

export function BareTerm(props: { term: Value }) {
  return (
    <span style={{ fontFamily: "monospace" }}>
      <TermView
        scopePath={[]}
        highlight={noHighlightProps}
        term={makeTermWithBindings(props.term, {})}
      />
    </span>
  );
}
