import React, { useState } from "react";
import useLocalStorage from "react-use-localstorage";
import { ReplCore } from "../replCore";
import { Relation } from "../types";
import * as styles from "./styles";
import { RelationTable, TableCollapseState } from "./relationTable";

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

  const [curRelationName, setCurRelationName]: [
    string,
    (v: string) => void
  ] = useLocalStorage(
    "selected-relation",
    allRelations.length === 0 ? null : allRelations[0].name
  );
  const [relationCollapseStates, setRelationCollapseStates] = useState<
    RelationCollapseStates
  >({});

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
        {relList(allTables, curRelationName, setCurRelationName)}
        <h4 style={{ marginBottom: 5, marginTop: 5 }}>Rules</h4>
        {relList(allRules, curRelationName, setCurRelationName)}
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        {curRelation ? (
          <RelationTable
            relation={curRelation}
            repl={props.repl}
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

function relList(
  relations: Relation[],
  curRelation: string,
  setCurRelation: (s: string) => void
) {
  return (
    <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 20 }}>
      {relations.map((rel) => (
        <li
          key={rel.name}
          style={styles.tab(rel.name === curRelation)}
          onClick={() => setCurRelation(rel.name)}
        >
          {rel.name}
        </li>
      ))}
    </ul>
  );
}
