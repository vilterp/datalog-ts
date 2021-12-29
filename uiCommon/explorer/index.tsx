import React, { useState } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Relation, Term } from "../../core/types";
import { noHighlight, HighlightProps } from "../dl/term";
import { useJSONLocalStorage } from "../generic/hooks";
import { RelationTree } from "./relationTree";
import { VizArea } from "./vizArea";
import { sortBy, toggle } from "../../util/util";
import { OpenRelationsContainer } from "./openRelationsContainer";
import { RelationCollapseStates } from "./types";

export function Explorer(props: {
  interp: AbstractInterpreter;
  showViz?: boolean;
}) {
  const allRules: Relation[] = sortBy(
    props.interp.getRules(),
    (r) => r.head.relation
  ).map((rule) => ({
    type: "Rule",
    name: rule.head.relation,
    rule,
  }));
  const allTables: Relation[] = [
    ...props.interp
      .getTables()
      .sort()
      .map(
        (name): Relation => ({
          type: "Table",
          name,
        })
      ),
    // TODO: virtual tables
  ];

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
      setOpenRelations(toggle(openRelations, name)),
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
          allRules={allRules}
          allTables={allTables}
          highlight={highlightProps}
          openRelations={openRelations}
          setOpenRelations={setOpenRelations}
        />
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        <OpenRelationsContainer
          interp={props.interp}
          highlight={highlightProps}
          collapseStates={relationCollapseStates}
          setCollapseStates={setRelationCollapseStates}
          open={openRelations}
          setOpen={setOpenRelations}
        />
      </div>
      {props.showViz ? (
        <div style={{ padding: 10, border: "1px solid black" }}>
          <VizArea
            interp={props.interp}
            setHighlightedTerm={(term: Term | null) =>
              term === null
                ? setHighlight({ type: "None" })
                : setHighlight({ type: "Term", term })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
