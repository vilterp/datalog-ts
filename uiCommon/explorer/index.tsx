import React, { useState } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Term, UserError } from "../../core/types";
import { noHighlight, HighlightProps } from "../dl/term";
import { useJSONLocalStorage } from "../generic/hooks";
import { RelationTree } from "./relationTree";
import { VizArea } from "./vizArea";
import { ensurePresent, sortBy } from "../../util/util";
import { OpenRelationsContainer } from "./openRelationsContainer";
import { RelationCollapseStates, RelationInfo, RelationStatus } from "./types";

export function Explorer(props: {
  interp: AbstractInterpreter;
  showViz?: boolean;
}) {
  const allRules: RelationInfo[] = sortBy(
    props.interp.getRules(),
    (r) => r.head.relation
  ).map((rule) => ({
    type: "Rule",
    name: rule.head.relation,
    rule,
    status: getStatus(props.interp, rule.head.relation),
  }));
  const allTables: RelationInfo[] = [
    ...props.interp
      .getTables()
      .sort()
      .map(
        (name): RelationInfo => ({
          type: "Table",
          name,
          status: getStatus(props.interp, name),
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
          interp={props.interp}
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

function getStatus(interp: AbstractInterpreter, name: string): RelationStatus {
  try {
    const count = interp.queryStr(`${name}{}`).length;
    return { type: "Count", count };
  } catch (e) {
    if (!(e instanceof UserError)) {
      console.error(`error while getting ${name}:`, e);
    }
    // TODO: this could swallow up an internal error...
    // should get better about errors...
    return { type: "Error" };
  }
}
