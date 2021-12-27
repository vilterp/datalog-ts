import React from "react";
import { Graphviz } from "graphviz-react";
import ReactJson from "react-json-view";
import { useWindowWidth } from "@react-hook/window-size";
import { TestOutput } from "./types";

export type SuiteSpec = {
  name: string;
  func: (inputs: string[]) => TestOutput[];
  inputs: string[];
  visualizers: { [mimeType: string]: (output: string) => React.ReactNode };
};

function GraphvizVisualizer(props: { dot: string }) {
  const width = useWindowWidth() - 300;
  return (
    <Graphviz
      dot={props.dot}
      options={{ width, height: 800, fit: true, zoom: false }}
    />
  );
}

export const VISUALIZERS = {
  "text/plain": (text) => <pre style={{ margin: 0 }}>{text}</pre>,
  // TODO: syntax highlight using TermView?
  "application/datalog": (text) => <pre style={{ margin: 0 }}>{text}</pre>,
  "application/graphviz": (text) => <GraphvizVisualizer dot={text} />,
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
