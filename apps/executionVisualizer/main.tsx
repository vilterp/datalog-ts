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
import { SequenceDiagram } from "../../uiCommon/visualizations/sequence";
import { parseRecord } from "../../languageWorkbench/languages/dl/parser";
import { parserTermToInternal } from "../../core/translateAST";
import { Rec, Term } from "../../core/types";

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
                <td>
                  <code>{key}</code>
                </td>
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
                  <code>{params[key]}</code>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {error ? <pre style={{ color: "red" }}>{error}</pre> : null}

      <Display interp={interp} />
    </>
  );
}

function Display(props: { interp: AbstractInterpreter }) {
  const [highlightedTerm, setHighlightedTerm] = useState<Term | null>(null);

  return (
    <>
      <CollapsibleWithHeading
        heading="Trace"
        content={<Explorer interp={props.interp} />}
      />

      <SequenceDiagram
        id="sequence"
        interp={props.interp}
        highlightedTerm={highlightedTerm}
        setHighlightedTerm={setHighlightedTerm}
        onDrag={(tag, delta) => {
          console.log("dragged", tag, "delta", delta);
        }}
        runStatements={() => {}}
        spec={
          parserTermToInternal(
            parseRecord(
              `sequence{
            actors: state.ProgramCounter{thread: ID},
            hops: viz.hop{fromTick: FromTick, toTick: ToTick},
            tickColor: viz.tickColor{tick: Tick, color: Color},
            hopColor: viz.hopColor{fromTick: FromTick, toTick: ToTick, color: Color},
          }`
            )
          ) as Rec
        }
      />
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
