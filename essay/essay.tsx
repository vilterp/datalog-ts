import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  TermView as TermC,
  noHighlightProps,
  HighlightProps,
  Highlight,
} from "../uiCommon/term";
import { rec, str, Term, Rec, Res, Statement } from "../types";
import { makeTermWithBindings } from "../traceTree";
import { ReplCore } from "../replCore";
import { language } from "../parser";
import { TraceView } from "../uiCommon/trace";
import { TreeCollapseState } from "../uiCommon/treeView";
import { ppr } from "../pretty";
import { RuleC } from "../uiCommon/rule";

function Query(props: { query: string; repl: ReplCore }) {
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
function EvalStmt(props: { stmt: string; repl: ReplCore }) {
  const stmt = language.statement.tryParse(props.stmt) as Statement;
  props.repl.evalStmt(stmt);
  return <Stmt stmt={stmt} />;
}

function Stmt(props: { stmt: Statement }) {
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

function BareTerm(props: { term: Term }) {
  return (
    <div style={{ fontFamily: "monospace" }}>
      <TermC
        scopePath={[]}
        highlight={noHighlightProps}
        term={makeTermWithBindings(props.term, {})}
      />
      .
    </div>
  );
}

function Essay() {
  const repl = new ReplCore((_) => {
    throw new Error("not found");
  });

  return (
    <>
      <h1>Hello world</h1>
      <p>This is an essay</p>
      <BareTerm
        term={rec("blog_post", {
          title: str("hello world"),
          date: str("6/10/20"),
        })}
      />
      <p>And that is an embedded term</p>
      <p>Now we're gonna add some statements:</p>
      <EvalStmt repl={repl} stmt={`father{child: "Pete", father: "Paul"}.`} />
      <EvalStmt repl={repl} stmt={`mother{child: "Pete", mother: "Mary"}.`} />
      <EvalStmt
        repl={repl}
        stmt={`parent{child: C, parent: P} :- father{child: C, father: P} | mother{child: C, mother: P}.`}
      />
      <p>And this is an embedded query:</p>
      <Query repl={repl} query="parent{child: C, parent: P}" />
      <p>And that's how we're gonna write this essay!</p>
    </>
  );
}

ReactDOM.render(<Essay />, document.getElementById("main"));
