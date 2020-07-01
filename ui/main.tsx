import React from "react";
import ReactDOM from "react-dom";
import { Interpreter } from "../interpreter";
import { nullLoader } from "../loaders";
import { Program, Res, Rec, StringLit } from "../types";
import { language } from "../parser";
import { LayoutManager } from "@jaegertracing/plexus";
// TODO(joe): Update import after killing `DirectedGraph`
import Digraph from "@jaegertracing/plexus/lib/DirectedGraph";
// @ts-ignore
import familyDL from "../testdata/family.dl";
import { uniqBy } from "../util";
import { TabbedTables } from "../uiCommon/tabbedTables";
import useLocalStorage from "react-use-localstorage";
import { Collapsible } from "../uiCommon/collapsible";

const lm = new LayoutManager({
  useDotEdges: true,
  rankdir: "TB",
  ranksep: 1.1,
});

function Main() {
  const [source, setSource] = useLocalStorage("fiddle-dl-source", familyDL);

  const output: Res[] = [];
  let error = null;
  let nodes = [];
  let edges = [];

  const interp = new Interpreter(".", nullLoader);
  try {
    const program = language.program.tryParse(source) as Program;
    program.forEach((stmt) => {
      interp.evalStmt(stmt).results.forEach((res) => output.push(res));
    });
    edges = uniqBy(
      interp.evalStr("edge{from: F, to: T, label: L}.").results.map((res) => ({
        from: ((res.term as Rec).attrs.from as StringLit).val,
        to: ((res.term as Rec).attrs.to as StringLit).val,
        label: ((res.term as Rec).attrs.label as StringLit).val,
      })),
      (e) => `${e.from}-${e.to}`
    );
    nodes = uniqBy(
      interp.evalStr("node{id: I, label: L}.").results.map((res) => ({
        key: ((res.term as Rec).attrs.id as StringLit).val,
        label: ((res.term as Rec).attrs.label as StringLit).val,
      })),
      (n) => n.key
    );
  } catch (e) {
    error = e.toString();
  }

  console.log({ nodes, edges });

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
      <h3>Explore</h3>
      <TabbedTables interp={interp} />
      <Collapsible
        heading="Graph"
        initiallyCollapsed={true}
        content={
          <Digraph
            zoom={true}
            edges={edges}
            vertices={nodes}
            layoutManager={lm}
          />
        }
      />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
