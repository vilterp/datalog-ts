import React, { useState } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Statement, Term } from "../../core/types";
import { noHighlight, HighlightProps } from "../dl/term";
import { useJSONLocalStorage } from "../generic/hooks";
import { RelationTree } from "./relationTree";
import { VizArea } from "./vizArea";
import { ensurePresent } from "../../util/util";
import { OpenRelationsContainer } from "./openRelationsContainer";
import { RelationCollapseStates } from "./types";
import { ReflexContainer, ReflexElement, ReflexSplitter } from "react-reflex";
import "react-reflex/styles.css";

export function Explorer(props: {
  interp: AbstractInterpreter;
  runStatements?: (stmts: Statement[]) => void;
  showViz?: boolean;
}) {
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
    <ReflexContainer orientation="vertical">
      <ReflexElement className="left-pane">
        <div className="pane-content">
          <RelationTree
            interp={props.interp}
            highlight={highlightProps}
            openRelations={openRelations}
            setOpenRelations={setOpenRelations}
          />
        </div>
      </ReflexElement>

      <ReflexSplitter />

      <ReflexElement className="middle-pane">
        <div className="pane-content">
          <OpenRelationsContainer
            interp={props.interp}
            highlight={highlightProps}
            collapseStates={relationCollapseStates}
            setCollapseStates={setRelationCollapseStates}
            open={openRelations}
            setOpen={setOpenRelations}
          />
        </div>
      </ReflexElement>

      <ReflexSplitter />

      <ReflexElement className="right-pane">
        <div className="pane-content">
          <VizArea
            interp={props.interp}
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
      </ReflexElement>
    </ReflexContainer>
  );
}
