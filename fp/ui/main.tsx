import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Expr, language as fpLanguage } from "../parser";
import { flatten } from "../flatten";
import { prettyPrintTerm } from "../../pretty";
import * as pp from "prettier-printer";
import { Rec, Res } from "../../types";
import { Loader } from "../../repl";
// @ts-ignore
import typecheckDL from "../typecheck.dl";
// @ts-ignore
import stdlibDL from "../stdlib.dl";
import { ReplCore } from "../../replCore";
import useLocalStorage from "react-use-localstorage";
import { useBoolLocalStorage } from "./util";

const loader: Loader = (path: string) => {
  switch (path) {
    case "typecheck.dl":
      return typecheckDL;
    case "stdlib.dl":
      return stdlibDL;
  }
};

function renderResults(results: Res[]): string[] {
  return results.map((res) => pp.render(100, prettyPrintTerm(res.term)));
}

function Main() {
  const [source, setSource] = useLocalStorage(
    "source",
    "let x = 2 in toString(x)"
  );

  const repl = new ReplCore(loader);
  repl.doLoad("typecheck.dl");
  repl.doLoad("stdlib.dl");
  let parsed: Expr = null;
  let rendered: string[] = [];
  let error = null;
  try {
    parsed = fpLanguage.expr.tryParse(source);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    rendered = printed.map((t) => pp.render(100, t) + ".");

    flattened.forEach((rec) =>
      repl.evalStmt({ type: "Insert", record: rec as Rec })
    );
  } catch (e) {
    error = e.toString();
  }

  return (
    <div>
      <h1>Datalog Typechecker</h1>
      <h2>Source</h2>
      <textarea
        onChange={(evt) => setSource(evt.target.value)}
        style={{ fontFamily: "monospace" }}
        cols={50}
        rows={10}
        value={source}
      />

      {error ? (
        <>
          <h2>Parse Error</h2>
          <pre>{error}</pre>
        </>
      ) : null}

      <Collapsible
        heading="AST"
        content={<pre>{JSON.stringify(parsed, null, 2)}</pre>}
      />

      <Collapsible
        heading="Flattened"
        content={<pre>{rendered.join("\n")}</pre>}
      />

      <Query
        heading="Scope"
        query="scope_item{id: I, name: N, type: T}."
        repl={repl}
      />

      <Query heading="Types" query="type{id: I, type: T}." repl={repl} />

      <Query
        heading="Suggestions"
        query="suggestion{id: I, name: N, type: T}."
        repl={repl}
      />

      <Query
        heading="Parent"
        query="parent_expr{id: I, parentID: P}."
        repl={repl}
      />

      <Collapsible heading="Builtins" content={<pre>{stdlibDL}</pre>} />

      <Collapsible heading="Rules" content={<pre>{typecheckDL}</pre>} />
    </div>
  );
}

function Query(props: { heading: string; query: string; repl: ReplCore }) {
  try {
    const results = props.repl.evalStr(props.query);
    return (
      <Collapsible
        heading={props.heading}
        content={<pre>{renderResults(results).sort().join("\n")}</pre>}
      />
    );
  } catch (e) {
    return (
      <Collapsible
        heading={props.heading}
        content={<pre>Error: {e.toString()}</pre>}
      />
    );
  }
}

function Collapsible(props: { heading: string; content: React.ReactNode }) {
  const [collapsed, setCollapsed] = useBoolLocalStorage(
    `collapsed-${props.heading}`,
    false
  );

  return (
    <>
      <h2
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {`${collapsed ? ">" : "v"} ${props.heading}`}
      </h2>
      {collapsed ? null : props.content}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
