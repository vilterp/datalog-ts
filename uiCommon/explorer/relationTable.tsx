import React, { useMemo, useReducer, useState } from "react";
import { Rec, rec, Relation, Rule, Statement } from "../../core/types";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { TreeCollapseState } from "../generic/treeView";
import { RuleC } from "../dl/rule";
import { TermView, noHighlight, HighlightProps } from "../dl/term";
import { TraceTreeView } from "../dl/trace";
import * as styles from "./styles";
import { jsonEq } from "../../util/json";
import { groupBy, objToPairs } from "../../util/util";
import { TableCollapseState } from "./types";
import { ppr } from "../../core/pretty";
import { makeTermWithBindings } from "../../core/termWithBindings";
import { RuleGraphEditor } from "../dl/ruleGraphEditor/ruleGraphEditor";

export function RelationTable(props: {
  relation: string;
  interp: AbstractInterpreter;
  runStatements: (stmts: Statement[]) => void;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
}) {
  const relation = props.interp.getRelation(props.relation);
  if (relation === null) {
    return <em>{props.relation} not found.</em>;
  }

  return (
    <>
      {relation.type === "Rule" ? (
        <RuleDisplay
          rule={relation.rule}
          highlight={props.highlight}
          relations={props.interp.getRelations()}
          interp={props.interp}
          runStatements={props.runStatements}
        />
      ) : null}
      <RelationContents
        collapseState={props.collapseState}
        setCollapseState={props.setCollapseState}
        highlight={props.highlight}
        interp={props.interp}
        relation={relation}
      />
    </>
  );
}

function RuleDisplay(props: {
  rule: Rule;
  highlight: HighlightProps;
  relations: Relation[];
  interp: AbstractInterpreter;
  runStatements: (stmts: Statement[]) => void;
}) {
  return (
    <>
      <RuleC highlight={props.highlight} rule={props.rule} />
      {/* <RuleEditor
        rule={props.rule}
        dispatch={(action) =>
          props.dispatch({
            type: "EditRule",
            newRule: ruleReducer(props.rule, action),
          })
        }
        relations={props.relations}
        interp={props.interp}
      /> */}
      {/* TODO: map back; show disjunctions */}
      <RuleGraphEditor
        rule={props.rule}
        setRule={(rule) =>
          props.runStatements([
            { type: "DeleteRule", name: props.rule.head.relation },
            { type: "Rule", rule },
          ])
        }
        relations={props.relations}
      />
    </>
  );
}

function RelationContents(props: {
  relation: Relation;
  interp: AbstractInterpreter;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
}) {
  const relation = props.relation;
  const [results, error] = useMemo(() => {
    try {
      const results =
        relation.type === "Table"
          ? props.interp.queryRec(rec(relation.name, {})).map((res) => ({
              term: res.term,
              bindings: {},
              trace: { type: "BaseFactTrace", fact: res.term },
            }))
          : relation.type === "Builtin"
          ? []
          : props.interp.queryRec(relation.rule.head);
      return [results, ""];
    } catch (e) {
      return [[], e.toString()];
    }
  }, [props.interp, props.relation]);
  const fields =
    results.length === 0
      ? []
      : relation.type === "Rule"
      ? Object.keys(relation.rule.head.attrs)
      : Object.keys((results[0].term as Rec).attrs);
  // TODO: make this more resilient in the face of records that don't
  //   all have the same fields.
  return (
    <>
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
              {/* expander */}
              <th />
              {fields.map((name) => (
                <th key={name} style={{ paddingLeft: 5, paddingRight: 5 }}>
                  <code>{name}</code>
                </th>
              ))}
              {/* count */}
              <th />
            </tr>
          </thead>
          <tbody>
            {/* TODO: preserve order? */}
            {objToPairs(groupBy(results, ppr)).map(([_, results], idx) => {
              const result = results[0];
              const sameResultCount = results.length;
              const key = JSON.stringify(result);
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
                    onMouseEnter={() =>
                      props.highlight.setHighlight({
                        type: "Term",
                        term: result.term,
                      })
                    }
                    onMouseLeave={() =>
                      props.highlight.setHighlight({
                        type: "None",
                      })
                    }
                    style={{
                      cursor: "pointer",
                      fontFamily: "monospace",
                      backgroundColor: isHighlighted
                        ? styles.highlightColor
                        : "",
                    }}
                  >
                    {relation.type === "Rule" && result.trace ? (
                      <td>{icon}</td>
                    ) : (
                      <td />
                    )}
                    {fields.map((field) => (
                      <td key={field} style={styles.TD_STYLES}>
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
                    <td>
                      {sameResultCount > 1 ? `(${sameResultCount})` : null}
                    </td>
                  </tr>
                  {rowCollapseState.collapsed || !result.trace ? null : (
                    <tr>
                      <td colSpan={fields.length + 1}>
                        <TraceTreeView
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
    </>
  );
}
