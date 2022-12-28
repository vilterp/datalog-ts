import React from "react";
import ReactJson from "react-json-view";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { Explorer } from "../../uiCommon/explorer";
import { TestOutput } from "../../util/ddTest/types";

export type SuiteSpec = {
  name: string;
  func: (inputs: string[]) => TestOutput[];
  inputs: string[];
  visualizers: { [mimeType: string]: (output: string) => React.ReactNode };
};

export const VISUALIZERS = {
  "text/plain": (text) => <pre style={{ margin: 0 }}>{text}</pre>,
  // TODO: syntax highlight using TermView?
  "application/datalog": (text) => <DLView text={text} />,
  // TODO: reinstate an actual graphviz viewer
  "application/graphviz": (text) => <pre style={{ margin: 0 }}>{text}</pre>,
  "application/json": (text) => (
    <ReactJson
      name={null}
      enableClipboard={false}
      displayObjectSize={false}
      displayDataTypes={false}
      src={JSON.parse(text)}
    />
  ),
};

function DLView(props: { text: string }) {
  let interp: AbstractInterpreter = new SimpleInterpreter(".", nullLoader);
  interp = interp.evalStr(props.text)[1];

  return (
    <>
      <Explorer interp={interp} />
    </>
  );
}
