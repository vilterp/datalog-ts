import React, { useState } from "react";
import ReactDOM from "react-dom";
import { language as fpLanguage } from "../parser";
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
  const [source, setSource] = useState("let x = 2 in toString(x)");

  const repl = new ReplCore(loader);
  repl.doLoad("typecheck.dl");
  repl.doLoad("stdlib.dl");
  let rendered: string[] = [];
  let scopeItems: Res[] = [];
  let types: Res[] = [];
  let parentExprs: Res[] = [];
  let error = null;
  try {
    const parsed = fpLanguage.expr.tryParse(source);
    const flattened = flatten(parsed);
    const printed = flattened.map(prettyPrintTerm);
    rendered = printed.map((t) => pp.render(100, t) + ".");

    flattened.forEach((rec) =>
      repl.evalStmt({ type: "Insert", record: rec as Rec })
    );
    scopeItems = repl.evalStr("scope_item{id: I, name: N, type: T}.");
    types = repl.evalStr("type{id: I, type: T}.");
    parentExprs = repl.evalStr("parent_expr{id: I, parentID: P}.");
  } catch (e) {
    error = e.toString();
  }

  console.log({ rendered, scopeItems, types, db: repl.db });

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
          <h2>Error</h2>
          <pre>{error}</pre>
        </>
      ) : null}

      <h2>Flattened AST</h2>
      <pre>{rendered.join("\n")}</pre>

      <h2>Scope</h2>
      <pre>{renderResults(scopeItems).sort().join("\n")}</pre>

      <h2>Types</h2>
      <pre>{renderResults(types).sort().join("\n")}</pre>

      <h2>Parent Exprs</h2>
      <pre>{renderResults(parentExprs).sort().join("\n")}</pre>

      <h2>Builtins (fixed)</h2>
      <pre>{stdlibDL}</pre>

      <h2>Rules (fixed)</h2>
      <pre>{typecheckDL}</pre>
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
