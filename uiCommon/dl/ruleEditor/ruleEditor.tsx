import React, { useLayoutEffect, useRef, useState } from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { gatherVars, pathToVar } from "./schemaUtils";
import { Disjunction, Relation, Res, Rule } from "../../../core/types";
import { removeAtIdx, updateAtIdx } from "../../../util/util";
import { TD_STYLES } from "../../explorer/styles";
import {
  buildGrid,
  emptyPositionMap,
  getPositionMap,
  PositionMap,
  ResultsParallelCoordsOverlay,
  ResultsParallelCoordsView,
} from "./parallelCoords";
import { DisjunctionAction, RuleAction } from "./types";
import { headReducer, TableHead } from "./head";
import { ConjunctionEditor, conjunctionReducer } from "./conjunction";
import { ResultsNormalView } from "./results";

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
  const [posMap, setPosMap] = useState<PositionMap>(emptyPositionMap);
  const [hoveredResults, setHoveredResults] = useState<Res[]>([]);
  let error = "";
  let results: Res[] = [];
  try {
    results = props.interp.queryRec(props.rule.head);
  } catch (e) {
    error = e.toString();
  }

  const outputTable = useRef(null);
  useLayoutEffect(() => {
    const newPosMap = getPositionMap(props.rule, grid, outputTable.current);
    if (JSON.stringify(posMap) !== JSON.stringify(newPosMap)) {
      setPosMap(newPosMap);
    }
  }, [results]);

  const grid = buildGrid(vars, results);

  return (
    <div style={{ display: "grid" }}>
      <div style={{ gridRow: 1, gridColumn: 1, pointerEvents: "none" }}>
        <ResultsParallelCoordsOverlay
          rule={props.rule}
          grid={grid}
          results={results}
          posMap={posMap}
          hoveredResults={hoveredResults}
        />
      </div>
      <div style={{ gridRow: 1, gridColumn: 1 }}>
        <table
          ref={outputTable}
          style={{
            borderCollapse: "collapse",
            fontFamily: "monospace",
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
            <ResultsParallelCoordsView
              grid={grid}
              hoveredResults={hoveredResults}
              setHoveredResults={setHoveredResults}
            />
            {/* Results normal view */}
            {/* <tr>
              <td
                colSpan={3 + vars.length}
                style={{ height: 1, backgroundColor: "black" }}
              ></td>
            </tr>
            <ResultsNormalView vars={vars} results={results} /> */}
          </tbody>
        </table>
      </div>
      <div>{error ? <pre style={{ color: "red" }}>{error}</pre> : null}</div>
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
