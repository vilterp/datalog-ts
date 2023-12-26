import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ResultsTable } from "../../uiCommon/explorer/resultsTable";
import { TableCollapseState } from "../../uiCommon/explorer/types";
import { noHighlightProps } from "../../uiCommon/dl/term";
import { Res } from "../../core/types";
import { MessageToWebView } from "./types";

export function Main() {
  const [relation, setRelation] = useState("");
  const [results, setResults] = useState<Res[]>([]);
  const [collapseState, setCollapseState] = useState<TableCollapseState>({});
  useEffect(() => {
    const listener = (evt) => {
      const msg = evt.data as MessageToWebView;
      switch (msg.type) {
        case "Relation": {
          setRelation(msg.relation);
          setResults(msg.results);
        }
      }
    };
    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
    };
  });

  return (
    <ResultsTable
      relation={{ type: "Table", name: relation }}
      collapseState={collapseState}
      setCollapseState={setCollapseState}
      highlight={noHighlightProps}
      results={results}
    />
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
