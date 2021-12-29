import React, { useState } from "react";
import useHashParam from "use-hash-param";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Relation, Term } from "../../core/types";
import { noHighlight, HighlightProps } from "../dl/term";
import { useJSONLocalStorage } from "../generic/hooks";
import { RelationTree } from "./relationTree";
import { VizArea } from "./vizArea";
import { sortBy, toggle } from "../../util/util";
import { RelationTableContainer } from "./relationTableContainer";
import { TableCollapseState } from "./types";

type RelationCollapseStates = { [key: string]: TableCollapseState };

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
  const allRelations: Relation[] = [...allTables, ...allRules];

  const [highlight, setHighlight] = useState(noHighlight);

  const [curRelationName, setCurRelationName]: [string, (v: string) => void] =
    useHashParam(
      "relation",
      allRelations.length === 0 ? null : allRelations[0].name
    );
  const [relationCollapseStates, setRelationCollapseStates] =
    useJSONLocalStorage<RelationCollapseStates>(
      "explorer-relation-table-collapse-state",
      {}
    );
  const [pinned, setPinned] = useJSONLocalStorage<string[]>(
    "explorer-pinned-state",
    []
  );

  const highlightProps: HighlightProps = {
    highlight,
    setHighlight,
    parentPaths: [],
    childPaths: [],
    onClickRelation: (name: string) => setPinned(toggle(pinned, name)),
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
          curRelationName={curRelationName}
          setCurRelationName={setCurRelationName}
          pinned={pinned}
          setPinned={setPinned}
        />
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        {curRelationName ? (
          <RelationTableContainer
            relation={curRelationName}
            interp={props.interp}
            highlight={highlightProps}
            collapseState={relationCollapseStates[curRelationName] || {}}
            setCollapseState={(st) =>
              setRelationCollapseStates({
                ...relationCollapseStates,
                [curRelationName]: st,
              })
            }
            pinned={pinned}
            setPinned={setPinned}
          />
        ) : (
          <em>No relations</em>
        )}
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
