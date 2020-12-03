import React, { useState } from "react";
import { Graphviz } from "graphviz-react";
import ReactJson from "react-json-view";
import { useWindowWidth } from "@react-hook/window-size";
import {
  EmissionLogAndGraph,
  emptyRuleGraph,
  formatRes,
} from "../../incremental/types";
import { toGraphviz } from "../../incremental/graphviz";
import { prettyPrintGraph } from "../../graphviz";
import { clamp } from "../../util";
import { TestOutput } from "./types";

export type SuiteSpec = {
  name: string;
  func: (inputs: string[]) => TestOutput[];
  inputs: string[];
  visualizers: { [mimeType: string]: (output: string) => React.ReactNode };
};

function EmissionLogViewer(props: { text: string }) {
  const logAndGraph: EmissionLogAndGraph = JSON.parse(props.text);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const highlightedNodeID = logAndGraph.log[highlightedIndex]?.fromID;
  const [stage, setStage] = useState(0);
  const width = useWindowWidth();

  const dot = prettyPrintGraph(
    toGraphviz(logAndGraph.graph, highlightedNodeID)
  );

  const range: [number, number] = [0, logAndGraph.log.length - 1];
  return (
    <div>
      <Graphviz
        dot={dot}
        options={{ width, height: 700, fit: true, zoom: false }}
      />
      <div>
        <button
          onClick={() =>
            setHighlightedIndex(clamp(highlightedIndex - 1, range))
          }
        >
          &lt;
        </button>
        <button
          onClick={() =>
            setHighlightedIndex(clamp(highlightedIndex + 1, range))
          }
        >
          &gt;
        </button>
      </div>
      <ul>
        {logAndGraph.log.map((batch, idx) => (
          <li
            key={idx}
            onClick={() => {
              setHighlightedIndex(idx);
              setStage(stage + 1);
            }}
            style={{
              cursor: "pointer",
              color: highlightedIndex === idx ? "red" : "black",
            }}
          >
            {batch.fromID}:{" "}
            <ul>
              {batch.output.map((res, idx) => (
                <li key={idx}>{formatRes(res)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GraphvizVisualizer(props: { dot: string }) {
  const width = useWindowWidth();
  return (
    <Graphviz
      dot={props.dot}
      options={{ width, height: 800, fit: true, zoom: false }}
    />
  );
}

export const VISUALIZERS = {
  "text/plain": (text) => <pre>{text}</pre>,
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
  "application/datalog": (text) => <pre>{text}</pre>,
  "incremental-datalog/trace": (text) => <EmissionLogViewer text={text} />,
};
