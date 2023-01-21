import Graphviz from "graphviz-react";
import React, { useState } from "react";
import ReactJson from "react-json-view";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { nullLoader } from "../../core/loaders";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { noHighlightProps } from "../../uiCommon/dl/term";
import { ResultsTable } from "../../uiCommon/explorer/resultsTable";
import { emptyTableCollapseState } from "../../uiCommon/explorer/types";
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
  "application/graphviz": (text) => <Graphviz dot={text} />,
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

  const [collapseState, setCollapseState] = useState(emptyTableCollapseState);

  const tables = interp.getTables();
  if (tables.length === 0) {
    return <em>No tables</em>;
  }

  const relation = interp.getTables()[0];

  return (
    <>
      <pre style={{ fontWeight: "bold" }}>{relation}</pre>
      <ResultsTable
        relation={{ type: "Table", name: relation }}
        collapseState={collapseState}
        setCollapseState={setCollapseState}
        highlight={noHighlightProps}
        results={interp.queryStr(`${relation}{}`)}
      />
    </>
  );
}
