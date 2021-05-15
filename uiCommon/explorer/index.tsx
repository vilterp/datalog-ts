import React, { useState } from "react";
import useHashParam from "use-hash-param";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Relation } from "../../core/types";
import { RelationTable, TableCollapseState } from "../relationTable";
import { noHighlight, HighlightProps } from "../term";
import { useJSONLocalStorage } from "../hooks";
import { RelationTree } from "./relationTree";
import { VizArea } from "./vizArea";

type RelationCollapseStates = { [key: string]: TableCollapseState };

export function Explorer(props: {
  interp: AbstractInterpreter;
  showViz?: boolean;
}) {
  const allRules: Relation[] = Object.keys(props.interp.db.rules)
    .sort()
    .map((name) => ({ type: "Rule", name, rule: props.interp.db.rules[name] }));
  const allTables: Relation[] = [
    ...Object.keys(props.interp.db.tables)
      .sort()
      .map(
        (name): Relation => ({
          type: "Table",
          name,
        })
      ),
    ...Object.keys(props.interp.db.virtualTables)
      .sort()
      .map(
        (name): Relation => ({
          type: "Table",
          name,
        })
      ),
  ];
  const allRelations: Relation[] = [...allTables, ...allRules];

  const [highlight, setHighlight] = useState(noHighlight);
  const highlightProps: HighlightProps = {
    highlight,
    setHighlight,
    parentPaths: [],
    childPaths: [],
  };

  const [curRelationName, setCurRelationName]: [
    string,
    (v: string) => void
  ] = useHashParam(
    "relation",
    allRelations.length === 0 ? null : allRelations[0].name
  );
  const [
    relationCollapseStates,
    setRelationCollapseStates,
  ] = useJSONLocalStorage<RelationCollapseStates>("collapse-state", {});

  const curRelation = allRelations.find((r) => r.name === curRelationName);

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
          curRelationName={curRelationName}
          setCurRelationName={setCurRelationName}
        />
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        {curRelation ? (
          <RelationTable
            relation={curRelation}
            interp={props.interp}
            highlight={highlightProps}
            collapseState={relationCollapseStates[curRelationName] || {}}
            setCollapseState={(st) =>
              setRelationCollapseStates({
                ...relationCollapseStates,
                [curRelationName]: st,
              })
            }
          />
        ) : (
          <em>No relations</em>
        )}
      </div>
      {props.showViz ? (
        <div style={{ padding: 10, border: "1px solid black" }}>
          <VizArea interp={props.interp} />
        </div>
      ) : null}
    </div>
  );
}
