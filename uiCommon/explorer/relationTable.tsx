import React, { useMemo } from "react";
import { rec, Res } from "../../core/types";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { RuleC } from "../dl/rule";
import { HighlightProps } from "../dl/term";
import { TableCollapseState } from "./types";
import { ResultsTable } from "./resultsTable";

export function RelationTable(props: {
  relation: string;
  interp: AbstractInterpreter;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
}) {
  const relation = props.interp.getRelation(props.relation);
  if (relation === null) {
    return <em>{props.relation} not found.</em>;
  }
  const [results, error] = useMemo((): [Res[], string] => {
    try {
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
      return [results, ""];
    } catch (e) {
      return [[], e.toString()];
    }
  }, [props.interp, props.relation]);
  // TODO: make this more resilient in the face of records that don't
  //   all have the same fields.
  return (
    <>
      {relation.type === "Rule" ? (
        <RuleC highlight={props.highlight} rule={relation.rule} />
      ) : null}
      {error !== "" ? (
        <ResultsTable
          results={results}
          highlight={props.highlight}
          collapseState={props.collapseState}
          relation={relation}
          setCollapseState={props.setCollapseState}
        />
      ) : (
        <pre style={{ color: "red" }}>{error}</pre>
      )}
    </>
  );
}
