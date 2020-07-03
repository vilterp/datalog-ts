import React, { useState } from "react";
import { language } from "../parser";
import { Rec, Statement, Res, Term } from "../types";
import { Interpreter } from "../interpreter";
import { ppr } from "../pretty";
import { RuleC } from "./rule";
import { noHighlightProps, Highlight, HighlightProps, TermView } from "./term";
import { TreeCollapseState } from "./treeView";
import { TraceView } from "./trace";
import { makeTermWithBindings } from "../traceTree";

// some views for making repl-like things
export function Query(props: { query: string; interp: Interpreter }) {
  const record = language.record.tryParse(props.query) as Rec;
  const results = props.interp.evalStmt({ type: "Insert", record })[0];
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

export function EvalStmt(props: {
  stmt: string;
  interp: Interpreter;
}): [Interpreter, React.ReactNode] {
  const stmt = language.statement.tryParse(props.stmt) as Statement;
  const [_, interp2] = props.interp.evalStmt(stmt);
  return [interp2, <Stmt stmt={stmt} />];
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
    <span style={{ fontFamily: "monospace" }}>
      <TermView
        scopePath={[]}
        highlight={noHighlightProps}
        term={makeTermWithBindings(props.term, {})}
      />
      .
    </span>
  );
}
