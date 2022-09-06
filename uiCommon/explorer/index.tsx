import React, { useReducer, useState } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Statement, Term } from "../../core/types";
import { noHighlight, HighlightProps } from "../dl/term";
import { useJSONLocalStorage } from "../generic/hooks";
import { RelationTree } from "./relationTree";
import { VizArea } from "./vizArea";
import { ensurePresent } from "../../util/util";
import { OpenRelationsContainer } from "./openRelationsContainer";
import { Action, RelationCollapseStates } from "./types";

export function Explorer(props: {
  interp: AbstractInterpreter;
  runStatements?: (stmts: Statement[]) => void;
  showViz?: boolean;
}) {
  const [interp, dispatch] = useReducer(explorerReducer, props.interp);

  const [highlight, setHighlight] = useState(noHighlight);

  const [relationCollapseStates, setRelationCollapseStates] =
    useJSONLocalStorage<RelationCollapseStates>(
      "explorer-relation-table-collapse-state",
      {}
    );
  const [openRelations, setOpenRelations] = useJSONLocalStorage<string[]>(
    "explorer-open-relations",
    []
  );

  const highlightProps: HighlightProps = {
    highlight,
    setHighlight,
    parentPaths: [],
    childPaths: [],
    onClickRelation: (name: string) =>
      setOpenRelations(ensurePresent(openRelations, name)),
  };

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          border: "1px solid black",
          overflow: "scroll",
          paddingTop: 10,
          paddingBottom: 10,
          width: 275, // TODO: make the divider draggable
        }}
      >
        <RelationTree
          interp={interp}
          highlight={highlightProps}
          openRelations={openRelations}
          setOpenRelations={setOpenRelations}
        />
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        <OpenRelationsContainer
          interp={interp}
          highlight={highlightProps}
          collapseStates={relationCollapseStates}
          setCollapseStates={setRelationCollapseStates}
          open={openRelations}
          setOpen={setOpenRelations}
          dispatch={dispatch}
        />
      </div>
      {props.showViz ? (
        <div style={{ padding: 10, border: "1px solid black" }}>
          <VizArea
            interp={interp}
            highlightedTerm={highlight.type === "Term" ? highlight.term : null}
            setHighlightedTerm={(term: Term | null) =>
              term === null
                ? setHighlight({ type: "None" })
                : setHighlight({ type: "Term", term })
            }
            runStatements={
              props.runStatements ||
              ((stmts) => {
                console.warn(
                  "no handler configured for statements; dropping",
                  stmts
                );
              })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function explorerReducer(
  state: AbstractInterpreter,
  action: Action
): AbstractInterpreter {
  switch (action.type) {
    case "EditRule":
      return state.evalStmt({ type: "Rule", rule: action.newRule })[1];
  }
}
