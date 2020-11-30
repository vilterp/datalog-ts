import React from "react";
import ReactDOM from "react-dom";
import { testSpecs } from "../incremental/ddTests";
import { zip } from "../util";

function Main() {
  return <TestViewer />;
}

function TestViewer() {
  return (
    <>
      <h1>DDTest Viewer</h1>
      <h3>Test Source</h3>
      <h3>Viewer</h3>
      {testSpecs.map((suite, idx) => {
        const outputs = suite.func(suite.inputs);
        const results = zip(suite.inputs, outputs, (input, output) => ({
          input,
          output,
        }));
        return (
          <div key={idx}>
            <h4>{suite.name}</h4>
            {results.map((result) => (
              <div>
                <pre>
                  {result.input}
                  <br />
                  ----
                </pre>
                {suite.visualizers[result.output.mimeType](
                  result.output.content
                )}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
