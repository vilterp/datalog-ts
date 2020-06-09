import React, { useState } from "react";
import useLocalStorage from "react-use-localstorage";
import { ReplCore } from "../replCore";
import { Relation } from "../types";
import * as styles from "./styles";
import { RelationTable, TableCollapseState } from "./relationTable";
import { noHighlight, HighlightProps } from "./term";
import { useJSONLocalStorage } from "./hooks";

type RelationCollapseStates = { [key: string]: TableCollapseState };

export function TabbedTables(props: { repl: ReplCore }) {
  const allRules: Relation[] = Object.keys(props.repl.db.rules)
    .sort()
    .map((name) => ({ type: "Rule", name, rule: props.repl.db.rules[name] }));
  const allTables: Relation[] = Object.keys(props.repl.db.tables)
    .sort()
    .map((name) => ({
      type: "Table",
      name,
      records: props.repl.db.tables[name],
    }));
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
  ] = useLocalStorage(
    "selected-relation",
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
          padding: 15,
          border: "1px solid black",
          width: 150,
        }}
      >
        <h4 style={{ marginBottom: 5, marginTop: 5 }}>Tables</h4>
        <RelList
          relations={allTables}
          curRelation={curRelationName}
          setCurRelation={setCurRelationName}
          highlight={highlightProps}
        />
        <h4 style={{ marginBottom: 5, marginTop: 5 }}>Rules</h4>
        <RelList
          relations={allRules}
          curRelation={curRelationName}
          setCurRelation={setCurRelationName}
          highlight={highlightProps}
        />
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        {curRelation ? (
          <RelationTable
            relation={curRelation}
            repl={props.repl}
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
    </div>
  );
}

function RelList(props: {
  relations: Relation[];
  curRelation: string;
  setCurRelation: (s: string) => void;
  highlight: HighlightProps;
}) {
  return (
    <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 20 }}>
      {props.relations.map((rel) => (
        <li
          key={rel.name}
          style={styles.tab({
            selected: rel.name === props.curRelation,
            highlighted:
              props.highlight.highlight.type === "Relation" &&
              props.highlight.highlight.name === rel.name,
          })}
          onClick={() => props.setCurRelation(rel.name)}
          // TODO: would be nice to factor out these handlers
          onMouseOver={() =>
            props.highlight.setHighlight({ type: "Relation", name: rel.name })
          }
          onMouseOut={() => props.highlight.setHighlight(noHighlight)}
        >
          {rel.name}
        </li>
      ))}
    </ul>
  );
}
