import React from "react";
import { ppr } from "../../core/pretty";
import { Rec, Relation, Res } from "../../core/types";
import { jsonEq } from "../../util/json";
import { groupBy, objToPairs } from "../../util/util";
import { HighlightProps, noHighlight, TermView } from "../dl/term";
import { useJSONLocalStorage } from "../generic/hooks";
import { TreeCollapseState } from "../generic/treeView";
import { TableCollapseState } from "./types";
import * as styles from "./styles";
import { makeTermWithBindings } from "../../core/termWithBindings";
import { TraceTreeView } from "../dl/trace";
import { termLT } from "../../core/unify";

type Ordering = { col: string; order: "Asc" | "Desc" };

export function ResultsTable(props: {
  relation: Relation;
  results: Res[];
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
}) {
  const [ordering, setOrdering] = useJSONLocalStorage<Ordering | null>(
    `explorer-ordering-${props.relation.name}`,
    null
  );
  const toggleOrdering = (name: string) => {
    toggleOrd(ordering, setOrdering, name);
  };

  const fields =
    props.results.length === 0
      ? []
      : props.relation.type === "Rule"
      ? Object.keys(props.relation.rule.head.attrs)
      : Object.keys((props.results[0].term as Rec).attrs);
  const groupedResults = objToPairs(groupBy(props.results, ppr));
  const sortedGroupedResults = sortResults(groupedResults, ordering);

  return props.results.length === 0 ? (
    <div style={{ fontStyle: "italic" }}>No results</div>
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
                  backgroundColor: isHighlighted ? styles.highlightColor : "",
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
                <td>{sameResultCount > 1 ? `(${sameResultCount})` : null}</td>
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
