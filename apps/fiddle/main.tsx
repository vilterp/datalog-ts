import React from "react";
import ReactDOM from "react-dom";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { nullLoader } from "../../core/loaders";
import { LayoutManager } from "@jaegertracing/plexus";
// @ts-ignore
import familyDL from "../../core/testdata/family_rules.dl";
import { Explorer } from "../../uiCommon/explorer";
import useLocalStorage from "react-use-localstorage";
import { SimpleInterpreter } from "../../core/simple/interpreter";

const lm = new LayoutManager({
  useDotEdges: true,
  rankdir: "TB",
  ranksep: 1.1,
});

function Main() {
  const [source, setSource] = useLocalStorage("fiddle-dl-source", familyDL);

  let error = null;

  let interp = new SimpleInterpreter(".", nullLoader) as AbstractInterpreter;
  try {
    interp = interp.evalStr(source)[1];
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
          <pre style={{ color: "red" }}>{error}</pre>
        </>
      ) : null}
      <h3>Explore</h3>
      <Explorer interp={interp} />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
