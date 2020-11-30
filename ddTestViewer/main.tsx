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
      <h1>DDTest Runner</h1>
      {testSpecs.map((suite, idx) => {
        const outputs = suite.func(suite.inputs);
        const results = zip(suite.inputs, outputs, (input, output) => ({
          input,
          output,
        }));
        return (
          <div key={idx}>
            <h2>{suite.name}</h2>
            {results.map((result, idx) => (
              <div key={idx}>
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
