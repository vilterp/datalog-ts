import React from "react";
import ReactDOM from "react-dom";
import { nullLoader } from "../../core/loaders";
// @ts-ignore
import familyDL from "../../core/testdata/family_rules.dl";
import { Explorer } from "../../uiCommon/explorer";
import useLocalStorage from "react-use-localstorage";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

function Main() {
  const [source, setSource] = useLocalStorage("fiddle-dl-source", familyDL);

  let error = null;

  let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);
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
        spellCheck={false}
      />
      <br />
      {error ? (
        <>
          <h3>Error</h3>
          <pre style={{ fontFamily: "monospace", color: "red" }}>{error}</pre>
        </>
      ) : null}
      <h3>Explore</h3>
      <Explorer interp={interp} showViz />
    </div>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
