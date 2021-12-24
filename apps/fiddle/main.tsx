import React from "react";
import ReactDOM from "react-dom";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { nullLoader } from "../../core/loaders";
import { Program, Rec, StringLit } from "../../core/types";
import { language } from "../../core/parser";
import { LayoutManager } from "@jaegertracing/plexus";
// TODO(joe): Update import after killing `DirectedGraph`
import Digraph from "@jaegertracing/plexus/lib/DirectedGraph";
// @ts-ignore
import familyDL from "../../core/testdata/family_rules.dl";
import { uniqBy } from "../../util/util";
import { Explorer } from "../../uiCommon/explorer";
import useLocalStorage from "react-use-localstorage";
import { Collapsible } from "../../uiCommon/generic/collapsible";
import { SimpleInterpreter } from "../../core/simple/interpreter";

const lm = new LayoutManager({
  useDotEdges: true,
  rankdir: "TB",
  ranksep: 1.1,
});

function Main() {
  const [source, setSource] = useLocalStorage("fiddle-dl-source", familyDL);

  let error = null;
  let nodes = [];
  let edges = [];

  let interp = new SimpleInterpreter(".", nullLoader) as AbstractInterpreter;
  try {
    interp = interp.evalStr(source)[1];
    edges = uniqBy(
      interp.queryStr("edge{from: F, to: T, label: L}").map((res) => ({
        from: ((res.term as Rec).attrs.from as StringLit).val,
        to: ((res.term as Rec).attrs.to as StringLit).val,
        label: ((res.term as Rec).attrs.label as StringLit).val,
      })),
      (e) => `${e.from}-${e.to}`
    );
    nodes = uniqBy(
      interp.queryStr("node{id: I, label: L}").map((res) => ({
        key: ((res.term as Rec).attrs.id as StringLit).val,
        label: ((res.term as Rec).attrs.label as StringLit).val,
      })),
      (n) => n.key
    );
  } catch (e) {
    error = e.toString();
  }

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
      <Explorer interp={interp} />
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
