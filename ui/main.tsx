import React, { useState } from "react";
import ReactDOM from "react-dom";
import { ReplCore } from "../replCore";
import { Program, Res, Rec, StringLit } from "../types";
import { prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";
import { language } from "../parser";
import { LayoutManager } from "@jaegertracing/plexus";
// TODO(joe): Update import after killing `DirectedGraph`
import Digraph from "@jaegertracing/plexus/lib/DirectedGraph";
// @ts-ignore
import familyDL from "../testdata/family.dl";
import { uniqBy } from "../util";

const lm = new LayoutManager({
  useDotEdges: true,
  rankdir: "TB",
  ranksep: 1.1,
});

function Main() {
  const [source, setSource] = useState(familyDL);

  const output: Res[] = [];
  let error = null;
  let nodes = [];
  let edges = [];

  try {
    const repl = new ReplCore(null); // TODO: some loader
    const program = language.program.tryParse(source) as Program;
    program.forEach((stmt) => {
      repl.evalStmt(stmt).forEach((res) => output.push(res));
    });
    edges = uniqBy(
      repl.evalStr("edge{from: F, to: T, label: L}.").map((res) => ({
        from: ((res.term as Rec).attrs.from as StringLit).val,
        to: ((res.term as Rec).attrs.to as StringLit).val,
      })),
      (e) => `${e.from}-${e.to}`
    );
    nodes = uniqBy(
      repl.evalStr("node{id: I, label: L}.").map((res) => ({
        key: ((res.term as Rec).attrs.id as StringLit).val,
        label: ((res.term as Rec).attrs.label as StringLit).val,
      })),
      (n) => n.key
    );
  } catch (e) {
    error = e.toString();
  }

  console.log({ nodes, edges });

  // const vertices = [
  //   { key: "web", name: "web-app : login" },
  //   { key: "users", name: "user-store : get-user" },
  //   { key: "cache", name: "cache : get" },
  //   { key: "db", name: "db : get-user" },
  //   { key: "auth", name: "auth : login" },
  // ];
  // const testEdges = [
  //   { from: "web", to: "users" },
  //   { from: "web", to: "auth" },
  //   { from: "users", to: "cache" },
  //   { from: "users", to: "db" },
  // ];

  return (
    <div>
      <h1>Datalog Fiddle</h1>
      <textarea
        onChange={(evt) => setSource(evt.target.value)}
        value={source}
        style={{ fontFamily: "monospace" }}
        cols={50}
        rows={10}
      />
      <br />
      {error ? (
        <>
          <h3>Error</h3>
          <pre>{error}</pre>
        </>
      ) : null}
      <h3>Results</h3>
      <pre>
        {output
          .map((res) => pp.render(100, prettyPrintTerm(res.term)))
          .join("\n")}
      </pre>
      <h3>Graph</h3>
      <Digraph zoom={true} edges={edges} vertices={nodes} layoutManager={lm} />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
