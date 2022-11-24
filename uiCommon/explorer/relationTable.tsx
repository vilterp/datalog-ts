import React, { useMemo } from "react";
import { rec, Res } from "../../core/types";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { RuleC } from "../dl/rule";
import { HighlightProps } from "../dl/term";
import { TableCollapseState } from "./types";
import { ResultsTable } from "./resultsTable";

type RelationIssue = { type: "Error"; message: string } | { type: "NotFound" };

export function RelationTable(props: {
  relation: string;
  interp: AbstractInterpreter;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
}) {
  const relation = props.interp.getRelation(props.relation);
  const [results, issue] = useMemo((): [Res[], RelationIssue | null] => {
    try {
      if (relation === null) {
        return [[], { type: "NotFound" }];
      }
      const results =
        relation.type === "Table"
          ? props.interp.queryRec(rec(relation.name, {})).map(
              (res): Res => ({
                term: res.term,
                bindings: {},
                trace: { type: "BaseFactTrace" },
              })
            )
          : props.interp.queryRec(relation.rule.head);
      return [results, null];
    } catch (e) {
      return [[], { type: "Error", message: e.toString() }];
    }
  }, [props.interp, props.relation]);
  // TODO: make this more resilient in the case of records that don't
  //   all have the same fields.
  return (
    <>
      {relation && relation.type === "Rule" ? (
        <RuleC highlight={props.highlight} rule={relation.rule} />
      ) : null}
      {issue === null ? (
        <ResultsTable
          results={results}
          highlight={props.highlight}
          collapseState={props.collapseState}
          relation={relation}
          setCollapseState={props.setCollapseState}
        />
      ) : issue.type === "NotFound" ? (
        <em>{props.relation} not found.</em>
      ) : (
        <pre style={{ color: "red" }}>{issue.message}</pre>
      )}
    </>
  );
}
