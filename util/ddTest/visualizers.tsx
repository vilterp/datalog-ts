import React from "react";
import ReactJson from "react-json-view";
import { TestOutput } from "./types";

export type SuiteSpec = {
  name: string;
  func: (inputs: string[]) => TestOutput[];
  inputs: string[];
  visualizers: { [mimeType: string]: (output: string) => React.ReactNode };
};

export const VISUALIZERS = {
  "text/plain": (text) => <pre style={{ margin: 0 }}>{text}</pre>,
  // TODO: syntax highlight using TermView?
  "application/datalog": (text) => <pre style={{ margin: 0 }}>{text}</pre>,
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
