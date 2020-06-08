import React from "react";
import * as pp from "prettier-printer";
import useLocalStorage from "react-use-localstorage";
import { ReplCore } from "../replCore";
import { Rec, Res, Rule } from "../types";
import { prettyPrintRule, ppt } from "../pretty";
import * as styles from "./styles";

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
          <RelationTable relation={curRelation} repl={props.repl} />
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

type Relation =
  | { type: "Table"; name: string; records: Rec[] }
  | { type: "Rule"; name: string; rule: Rule };

function RelationTable(props: { relation: Relation; repl: ReplCore }) {
  const results: Res[] =
    props.relation.type === "Table"
      ? props.relation.records.map((term) => ({
          term,
          bindings: {},
          trace: { type: "BaseFactTrace", fact: term },
        }))
      : props.repl.evalStmt({
          type: "Insert",
          record: props.relation.rule.head,
        });
  console.log({ results });
  const records = results.map((r) => r.term);
  const fields =
    records.length === 0
      ? []
      : (props.relation.type === "Rule"
          ? Object.keys(props.relation.rule.head.attrs)
          : Object.keys((props.relation.records[0] as Rec).attrs)
        ).sort((a, b) => fieldComparator(a).localeCompare(fieldComparator(b)));
  return (
    <>
      {props.relation.type === "Rule" ? (
        <pre style={{ marginTop: 5 }}>
          {pp.render(50, prettyPrintRule(props.relation.rule))}
        </pre>
      ) : null}
      {records.length === 0 ? (
        <div style={{ fontStyle: "italic" }}>No results</div>
      ) : (
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid black" }}>
              {fields.map((name) => (
                <th key={name} style={{ paddingLeft: 5, paddingRight: 5 }}>
                  <code>{name}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={ppt(record)}>
                {fields.map((field) => (
                  <td
                    key={field}
                    style={{
                      paddingLeft: 5,
                      paddingRight: 5,
                      borderLeft: "1px solid lightgrey",
                      borderRight: "1px solid lightgrey",
                    }}
                  >
                    <code>{ppt((record as Rec).attrs[field])}</code>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function fieldComparator(field: string): string {
  switch (field) {
    case "id":
      return "aaaaaa_id";
    case "location":
      return "zzzzzz_location";
    default:
      return field;
  }
}
