import React, { useState } from "react";
import { language } from "../parser";
import { Rec, Statement, Res, Term } from "../types";
import { ReplCore } from "../replCore";
import { ppr } from "../pretty";
import { RuleC } from "./rule";
import { noHighlightProps, Highlight, HighlightProps, TermView } from "./term";
import { TreeCollapseState } from "./treeView";
import { TraceView } from "./trace";
import { makeTermWithBindings } from "../traceTree";

// some views for making repl-like things
export function Query(props: { query: string; repl: ReplCore }) {
  const record = language.record.tryParse(props.query) as Rec;
  const results = props.repl.evalStmt({ type: "Insert", record });
  return (
    <div style={{ fontFamily: "monospace" }}>
      <BareTerm term={record} />
      <hr />
      {results.results.map((res) => (
        <IndependentTraceView key={ppr(res)} res={res} />
      ))}
    </div>
  );
}

// careful, this mutates the repl...
// TODO: make ReplCore immutable...
export function EvalStmt(props: { stmt: string; repl: ReplCore }) {
  const stmt = language.statement.tryParse(props.stmt) as Statement;
  props.repl.evalStmt(stmt);
  return <Stmt stmt={stmt} />;
}

export function Stmt(props: { stmt: Statement }) {
  switch (props.stmt.type) {
    case "Insert":
      return <BareTerm term={props.stmt.record} />;
    case "Rule":
      return <RuleC highlight={noHighlightProps} rule={props.stmt.rule} />;
    default:
      return <pre>{JSON.stringify(props.stmt)}</pre>;
  }
}

function IndependentTraceView(props: { res: Res }) {
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
    <TraceView
      collapseState={collapseState}
      setCollapseState={setCollapseState}
      highlight={hlProps}
      result={props.res}
    />
  );
}

export function BareTerm(props: { term: Term }) {
  return (
    <div style={{ fontFamily: "monospace" }}>
      <TermView
        scopePath={[]}
        highlight={noHighlightProps}
        term={makeTermWithBindings(props.term, {})}
      />
      .
    </div>
  );
}
