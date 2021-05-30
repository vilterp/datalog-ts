import React, { useState } from "react";
import { ppt } from "../../core/pretty";
import { Rec, Res, Relation, rec } from "../../core/types";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import {
  TreeCollapseState,
  TreeView,
  emptyCollapseState,
} from "../generic/treeView";
import { RuleC } from "../dl/rule";
import { makeTermWithBindings } from "../../core/traceTree";
import { TermView, noHighlight, HighlightProps } from "../dl/term";
import { TraceView } from "../dl/trace";
import { canTreeViz, treeFromRecords } from "../visualizations/tree";
import { BareTerm } from "../dl/replViews";
import * as styles from "./styles";
import { jsonEq } from "../../util/json";
import { RuleDiagram } from "../ruleDiagram";

export type TableCollapseState = {
  [key: string]: TreeCollapseState;
};

export function RelationTable(props: {
  relation: Relation;
  interp: AbstractInterpreter;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
}) {
  let error: string = "";
  let results: Res[] = [];
  try {
    results =
      props.relation.type === "Table"
        ? props.interp.queryRec(rec(props.relation.name, {})).map((res) => ({
            term: res.term,
            bindings: {},
            trace: { type: "BaseFactTrace", fact: res.term },
          }))
        : props.interp.queryRec(props.relation.rule.head);
  } catch (e) {
    error = e.toString();
    console.error(e);
  }
  const fields =
    results.length === 0
      ? []
      : (props.relation.type === "Rule"
          ? Object.keys(props.relation.rule.head.attrs)
          : Object.keys((results[0].term as Rec).attrs)
        ).sort((a, b) => fieldComparator(a).localeCompare(fieldComparator(b)));
  return (
    <>
      {props.relation.type === "Rule" ? (
        <>
          <RuleC highlight={props.highlight} rule={props.relation.rule} />
          <RuleDiagram rule={props.relation.rule} />
        </>
      ) : null}
      {results.length === 0 ? (
        error === "" ? (
          <div style={{ fontStyle: "italic" }}>No results</div>
        ) : (
          <pre style={{ color: "red" }}>{error}</pre>
        )
      ) : (
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid black" }}>
              <th />
              {fields.map((name) => (
                <th key={name} style={{ paddingLeft: 5, paddingRight: 5 }}>
                  <code>{name}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((result, idx) => {
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
              const icon = rowCollapseState.collapsed ? ">" : "v";
              const highlight = props.highlight.highlight;
              const isHighlighted =
                highlight.type === "Term" &&
                highlight.term.type === "Record" &&
                jsonEq(result.term, highlight.term);
              return (
                <React.Fragment key={`${idx}-${key}`}>
                  <tr
                    onClick={toggleRowCollapsed}
                    style={{
                      cursor: "pointer",
                      fontFamily: "monospace",
                      backgroundColor: isHighlighted
                        ? styles.highlightColor
                        : "",
                    }}
                  >
                    {props.relation.type === "Rule" && result.trace ? (
                      <td>{icon}</td>
                    ) : (
                      <td />
                    )}
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
                        <TermView
                          term={makeTermWithBindings(
                            (result.term as Rec).attrs[field],
                            {}
                          )}
                          highlight={{
                            highlight: noHighlight,
                            setHighlight: () => {},
                            childPaths: [],
                            parentPaths: [],
                          }}
                          scopePath={[]}
                        />
                      </td>
                    ))}
                  </tr>
                  {rowCollapseState.collapsed || !result.trace ? null : (
                    <tr>
                      <td colSpan={fields.length + 1}>
                        <TraceView
                          result={result}
                          highlight={props.highlight}
                          collapseState={rowCollapseState}
                          setCollapseState={(st) =>
                            props.setCollapseState({
                              ...props.collapseState,
                              [key]: st,
                            })
                          }
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
      <PossibleTreeViz results={results} />
    </>
  );
}

// TODO: phase out in favor of explorer's viz capabilities
function PossibleTreeViz(props: { results: Res[] }) {
  if (props.results.length === 0) {
    return null;
  }
  if (!canTreeViz(props.results[0].term as Rec)) {
    return null;
  }
  const tree = treeFromRecords(
    props.results.map((res) => res.term as Rec),
    "0" // TODO: configurable root node
  );
  const [collapseState, setCollapseState] = useState(emptyCollapseState);
  return canTreeViz(props.results[0].term as Rec) ? (
    <div style={{ marginTop: 15 }}>
      Data as tree:
      <TreeView
        tree={tree}
        render={(node) =>
          node.item ? <BareTerm term={node.item} /> : "<root>"
        }
        collapseState={collapseState}
        setCollapseState={setCollapseState}
      />
    </div>
  ) : null;
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
