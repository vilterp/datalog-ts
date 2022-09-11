import React, { useLayoutEffect, useRef } from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { gatherVars, pathToVar } from "./schemaUtils";
import { Disjunction, Relation, Rule } from "../../../core/types";
import { removeAtIdx, updateAtIdx } from "../../../util/util";
import { TD_STYLES } from "../../explorer/styles";
import { buildGrid } from "./parallelCoords";
import { DisjunctionAction, RuleAction } from "./types";
import { headReducer, TableHead } from "./head";
import { ConjunctionEditor, conjunctionReducer } from "./conjunction";
import { ResultsParallelCoordsView } from "./results";

// === Rule ===

export function RuleEditor(props: {
  rule: Rule;
  dispatch: (a: RuleAction) => void;
  relations: Relation[];
  interp: AbstractInterpreter;
}) {
  const vars = gatherVars(props.rule).sort();
  const order = vars.map((varName) => {
    const path = pathToVar(props.rule.head, varName);
    const pathStr = path ? path.join(".") : "";
    return {
      varName: varName,
      attr: pathStr,
    };
  });
  const results = props.interp.queryRec(props.rule.head);

  const outputTable = useRef(null);
  useLayoutEffect(() => {
    console.log("layout effect", outputTable);
  });

  const grid = buildGrid(vars, results);

  return (
    <div style={{ display: "grid" }}>
      <table
        ref={outputTable}
        style={{
          borderCollapse: "collapse",
          fontFamily: "monospace",
          gridRow: 1,
          gridColumn: 1,
        }}
      >
        <TableHead dispatch={props.dispatch} order={order} />
        <tbody>
          {props.rule.body.disjuncts.map((conjunction, disjunctIdx) => (
            <ConjunctionEditor
              key={`disjunct${disjunctIdx}`}
              vars={vars}
              rule={props.rule}
              conjunction={conjunction}
              dispatch={(action) =>
                props.dispatch({
                  type: "EditBody",
                  action: { type: "EditDisjunct", idx: disjunctIdx, action },
                })
              }
              relations={props.relations}
              removeDisjunct={() =>
                props.dispatch({
                  type: "EditBody",
                  action: { type: "RemoveDisjunct", idx: disjunctIdx },
                })
              }
              disjunctIdx={disjunctIdx}
            />
          ))}
          <tr style={{ borderTop: "1px solid lightgrey" }}>
            <td colSpan={vars.length + 3} style={TD_STYLES}>
              <button
                onClick={() =>
                  props.dispatch({
                    type: "EditBody",
                    action: { type: "AddDisjunct" },
                  })
                }
                title="Add Disjunct"
              >
                +
              </button>
            </td>
          </tr>
          {/* Results */}
          <ResultsParallelCoordsView grid={grid} />
        </tbody>
      </table>
      <svg style={{ gridRow: 1, gridColumn: 1 }}>
        <line
          x1="0"
          y1="0"
          x2="200"
          y2="200"
          style={{ stroke: "rgb(255,0,0)", strokeWidth: 2 }}
        />
      </svg>
    </div>
  );
}

export function ruleReducer(rule: Rule, action: RuleAction): Rule {
  switch (action.type) {
    case "EditBody":
      return { ...rule, body: disjunctionReducer(rule.body, action.action) };
    case "EditHead":
      return { ...rule, head: headReducer(rule.head, action.action) };
  }
}

// === Disjunction ===

function disjunctionReducer(
  disjunction: Disjunction,
  action: DisjunctionAction
): Disjunction {
  switch (action.type) {
    case "AddDisjunct":
      return {
        type: "Disjunction",
        disjuncts: [
          ...disjunction.disjuncts,
          { type: "Conjunction", conjuncts: [] },
        ],
      };
    case "RemoveDisjunct":
      return {
        type: "Disjunction",
        disjuncts: removeAtIdx(disjunction.disjuncts, action.idx),
      };
    case "EditDisjunct":
      return {
        type: "Disjunction",
        disjuncts: updateAtIdx(disjunction.disjuncts, action.idx, (conj) =>
          conjunctionReducer(conj, action.action)
        ),
      };
  }
}
