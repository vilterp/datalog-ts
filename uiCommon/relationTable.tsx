import React from "react";
import { ppt, prettyPrintRule } from "../pretty";
import { Rec, Res, Relation } from "../types";
import { ReplCore } from "../replCore";
import * as pp from "prettier-printer";
import { TreeCollapseState, TreeView } from "./treeView";
import { traceToTree } from "../traceTree";

export type TableCollapseState = {
  [key: string]: TreeCollapseState;
};

export function RelationTable(props: {
  relation: Relation;
  repl: ReplCore;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
}) {
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
  const fields =
    results.length === 0
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
      {results.length === 0 ? (
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
            {results.map((result) => {
              const key = ppt(result.term);
              const rowCollapseState: TreeCollapseState = props.collapseState[
                key
              ] || { collapsed: true, childStates: {} };
              const toggleRowCollapsed = () => {
                props.setCollapseState({
                  ...props.collapseState,
                  [key]: {
                    ...rowCollapseState,
                    collapsed: !rowCollapseState.collapsed,
                  },
                });
              };
              return (
                <React.Fragment key={key}>
                  <tr>
                    {fields.map((field) => (
                      <td
                        key={field}
                        style={{
                          paddingLeft: 5,
                          paddingRight: 5,
                          borderLeft: "1px solid lightgrey",
                          borderRight: "1px solid lightgrey",
                        }}
                        onClick={toggleRowCollapsed}
                      >
                        <code>{ppt((result.term as Rec).attrs[field])}</code>
                      </td>
                    ))}
                  </tr>
                  {rowCollapseState.collapsed ? null : (
                    <tr>
                      <td colSpan={fields.length}>
                        <TreeView
                          tree={traceToTree(result)}
                          collapseState={rowCollapseState}
                          setCollapseState={(st) => {
                            console.log("RelationTable set state", { key, st });
                            props.setCollapseState({
                              ...props.collapseState,
                              [key]: st,
                            });
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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
