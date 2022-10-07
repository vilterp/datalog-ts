import React, { useMemo } from "react";
import { Rec, rec, Res } from "../../core/types";
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
import { useJSONLocalStorage } from "../generic/hooks";
import { termLT } from "../../core/unify";

type Ordering = { col: string; order: "Asc" | "Desc" };

export function RelationTable(props: {
  relation: string;
  interp: AbstractInterpreter;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
}) {
  const [ordering, setOrdering] = useJSONLocalStorage<Ordering | null>(
    `explorer-ordering-${props.relation}`,
    null
  );
  const toggleOrdering = (name: string) => {
    toggleOrd(ordering, setOrdering, name);
  };

  const relation = props.interp.getRelation(props.relation);
  if (relation === null) {
    return <em>{props.relation} not found.</em>;
  }
  const [results, error] = useMemo(() => {
    try {
      const results =
        relation.type === "Table"
          ? props.interp.queryRec(rec(relation.name, {})).map((res) => ({
              term: res.term,
              bindings: {},
              trace: { type: "BaseFactTrace", fact: res.term },
            }))
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
  const groupedResults = objToPairs(groupBy(results, ppr));
  const sortedGroupedResults = sortResults(groupedResults, ordering);
  // TODO: make this more resilient in the face of records that don't
  //   all have the same fields.
  return (
    <>
      {relation.type === "Rule" ? (
        <RuleC highlight={props.highlight} rule={relation.rule} />
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
              {/* expander */}
              <th />
              {fields.map((name) => {
                const orderInd =
                  ordering === null || ordering.col !== name
                    ? ""
                    : ordering.order === "Asc"
                    ? "^ "
                    : "v ";
                return (
                  <th
                    key={name}
                    style={{
                      paddingLeft: 5,
                      paddingRight: 5,
                      cursor: "pointer",
                    }}
                    onClick={() => toggleOrdering(name)}
                  >
                    <code>
                      {orderInd}
                      {name}
                    </code>
                  </th>
                );
              })}
              {/* count */}
              <th />
            </tr>
          </thead>
          <tbody>
            {sortedGroupedResults.map(([_, results], idx) => {
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

function toggleOrd(
  ordering: Ordering,
  setOrdering: (o: Ordering) => void,
  name: string
) {
  if (ordering === null || name !== ordering.col) {
    setOrdering({ col: name, order: "Desc" });
    return;
  }
  if (ordering.order === "Desc") {
    setOrdering({
      col: name,
      order: "Asc",
    });
    return;
  }
  setOrdering(null);
}

function sortResults(
  groupedResults: [string, Res[]][],
  ordering: Ordering | null
) {
  if (ordering === null) {
    return groupedResults;
  }
  return groupedResults.sort(
    ([leftKey, leftResults], [rightKey, rightResults]) => {
      const leftRes = leftResults[0] as Res;
      const rightRes = rightResults[0] as Res;
      const leftTerm = (leftRes.term as Rec).attrs[ordering.col];
      const rightTerm = (rightRes.term as Rec).attrs[ordering.col];
      const res = termLT(leftTerm, rightTerm) ? 1 : -1;
      return ordering.order === "Desc" ? res : res * -1;
    }
  );
}
