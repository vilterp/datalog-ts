import React, { useState } from "react";
import ReactDOM from "react-dom";
import { LingoEditor } from "../../uiCommon/ide/editor";
import { LANGUAGES } from "../../languageWorkbench/languages";
import { initialEditorState } from "../../uiCommon/ide/types";
import { useJSONLocalStorage } from "../../uiCommon/generic/hooks";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { Explorer } from "../../uiCommon/explorer";
import { getProgram, stepAndRecord } from "./stepAndRecord";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { LOADER } from "./dl";
// @ts-ignore
import EXAMPLE_BB from "../../languageWorkbench/languages/basicBlocks/example.txt";
import { mapObj } from "../../util/util";
import { Params } from "./interpreter";

function Main() {
  const [editorState, setEditorState] = useJSONLocalStorage(
    "exec-viz-source",
    initialEditorState(EXAMPLE_BB)
  );

  // get program and store values for its parameters
  const program = getProgram(editorState.source);
  const [params, setParams] = useState<Params>(
    mapObj(program.params, (k, v) => v.defaultValue)
  );
  const setParam = (key: string, value: number) => {
    setParams({ ...params, [key]: value });
  };

  // step the program and record each state
  const initInterp: AbstractInterpreter = new IncrementalInterpreter(
    ".",
    LOADER
  );
  const [state, interp, error] = stepAndRecord(initInterp, program, params);

  return (
    <>
      <h1>Execution Visualizer</h1>

      <LingoEditor
        langSpec={LANGUAGES.basicBlocks}
        editorState={editorState}
        setEditorState={(newEditorState) => setEditorState(newEditorState)}
      />

      {error ? <pre style={{ color: "red" }}>{error}</pre> : null}

      <table>
        <thead>
          <tr>
            <th>Param</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(params)
            .sort((a, b) => a.localeCompare(b))
            .map((key) => (
              <tr key={key}>
                <td>{key}</td>
                <td>
                  <input
                    type="range"
                    value={params[key] as number}
                    onChange={(evt) => {
                      setParam(key, parseInt(evt.target.value));
                    }}
                    min={0}
                    max={50}
                  />
                  {params[key]}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <CollapsibleWithHeading
        heading="Trace"
        content={<Explorer interp={interp} showViz />}
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
