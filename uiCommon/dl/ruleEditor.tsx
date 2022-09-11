import React, { useLayoutEffect, useRef, useState } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import {
  conjunctName,
  gatherVars,
  newConjunct,
  pathToVar,
  relationColumns,
} from "../../core/schemaUtils";
import {
  Conjunct,
  Conjunction,
  Disjunction,
  Rec,
  rec,
  Relation,
  Res,
  Rule,
  varr,
} from "../../core/types";
import {
  intersperseIdx,
  pairsToObj,
  range,
  removeAtIdx,
  updateAtIdx,
} from "../../util/util";
import { TD_STYLES } from "../explorer/styles";
import { BareTerm } from "../dl/replViews";
import { VegaLite } from "react-vega";
import { ppt } from "../../core/pretty";
import { buildGrid, Grid } from "./parallelCoords";

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
        <thead>
          <tr style={{ borderBottom: "1px solid black" }}>
            {/* 'or' control, delete conjunct button, conjunct name */}
            <th colSpan={3} />
            {order.map((pair, idx) => {
              return (
                <th key={idx} style={TD_STYLES}>
                  <input
                    size={Math.max(1, pair.attr.length)}
                    value={pair.attr}
                    onChange={(evt) =>
                      props.dispatch({
                        type: "EditHead",
                        action: {
                          type: "EditAttr",
                          idx,
                          order,
                          newAttr: evt.target.value,
                        },
                      })
                    }
                  />
                  <button
                    onClick={() =>
                      props.dispatch({
                        type: "EditHead",
                        action: { type: "DeleteColumn", order, idx },
                      })
                    }
                    title="Delete Column"
                  >
                    x
                  </button>
                </th>
              );
            })}
          </tr>
          {/* <tr style={{ borderBottom: "1px solid black" }}>
          <th colSpan={3} />
          {order.map((pair, idx) => (
            <th key={idx} style={TD_STYLES}>
              <input
                size={Math.max(1, pair.varName.length)}
                value={pair.varName}
                onChange={(evt) =>
                  props.dispatch({
                    type: "EditHead",
                    action: {
                      type: "EditVar",
                      order,
                      idx,
                      newVar: evt.target.value,
                    },
                  })
                }
              />
            </th>
          ))}
        </tr> */}
        </thead>
        <tbody>
          {intersperseIdx(
            (idx) => (
              <tr key={`sep${idx}`}>
                <td colSpan={vars.length + 1} style={{ textAlign: "center" }}>
                  {" "}
                </td>
              </tr>
            ),
            props.rule.body.disjuncts.map((conjunction, disjunctIdx) => (
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
            ))
          )}
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

function ResultsParallelCoordsView(props: { grid: Grid }) {
  return (
    <>
      {range(props.grid.longest).map((idx) => {
        return (
          <tr>
            <td colSpan={3} />
            {props.grid.vars.map((varName) => {
              const value = props.grid.grid[varName][idx];
              return (
                <td style={TD_STYLES}>
                  {value ? <BareTerm term={value} /> : null}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

function ResultsNormalView(props: { vars: string[]; results: Res[] }) {
  return (
    <>
      {props.results.map((result, idx) => {
        return (
          <tr key={idx}>
            <td colSpan={3} />
            {props.vars.map((varName) => {
              const value = result.bindings[varName];
              return (
                <td
                  key={varName}
                  style={TD_STYLES}
                  data-var={varName}
                  data-val={value ? ppt(value) : null}
                >
                  {value ? <BareTerm term={value} /> : null}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

type RuleAction =
  | { type: "EditHead"; action: HeadAction }
  | { type: "EditBody"; action: DisjunctionAction };

export function ruleReducer(rule: Rule, action: RuleAction): Rule {
  switch (action.type) {
    case "EditBody":
      return { ...rule, body: disjunctionReducer(rule.body, action.action) };
    case "EditHead":
      return { ...rule, head: headReducer(rule.head, action.action) };
  }
}

type Order = { varName: string; attr: string }[];

type HeadAction =
  | { type: "EditName"; name: string }
  | {
      type: "EditVar";
      idx: number;
      order: Order;
      newVar: string;
    }
  | {
      type: "EditAttr";
      idx: number;
      order: Order;
      newAttr: string;
    }
  | { type: "DeleteColumn"; order: Order; idx: number };

export function headReducer(head: Rec, action: HeadAction): Rec {
  switch (action.type) {
    case "EditName":
      return rec(action.name, head.attrs);
    // TODO: DRY these two up
    case "EditAttr": {
      const newOrder = updateAtIdx(action.order, action.idx, (pair) => ({
        varName: pair.varName,
        attr: action.newAttr,
      }));
      return buildRuleHead(head.relation, newOrder);
    }
    case "EditVar": {
      const newOrder = updateAtIdx(action.order, action.idx, (pair) => ({
        varName: action.newVar,
        attr: pair.attr,
      }));
      return buildRuleHead(head.relation, newOrder);
    }
    case "DeleteColumn": {
      const newOrder = removeAtIdx(action.order, action.idx);
      return buildRuleHead(head.relation, newOrder);
    }
  }
}

function buildRuleHead(relation: string, newOrder: Order): Rec {
  const pairs = newOrder
    .filter((p) => p.attr != "")
    .map(({ varName, attr }) => ({
      key: attr,
      val: varr(varName),
    }));
  return rec(relation, pairsToObj(pairs));
}

// === Disjunction ===

type DisjunctionAction =
  | { type: "AddDisjunct" }
  | { type: "RemoveDisjunct"; idx: number }
  | { type: "EditDisjunct"; idx: number; action: ConjunctionAction };

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

// === Conjunction ===

function ConjunctionEditor(props: {
  vars: string[];
  rule: Rule;
  conjunction: Conjunction;
  dispatch: (a: ConjunctionAction) => void;
  relations: Relation[];
  disjunctIdx: number;
  removeDisjunct: () => void;
}) {
  const [selectedToAdd, setSelectedToAdd] = useState("+");
  const removeButton = (
    <button onClick={() => props.removeDisjunct()} title="Remove Disjunct">
      x
    </button>
  );

  return (
    <>
      {props.conjunction.conjuncts.map((conjunct, conjunctIdx) => {
        const name = conjunctName(conjunct);
        return (
          <tr
            key={conjunctIdx}
            style={
              conjunctIdx === 0 ? { borderTop: "1px solid lightgrey" } : {}
            }
          >
            <td style={TD_STYLES}>
              {conjunctIdx === 0 ? <>{removeButton}</> : null}
            </td>
            <td style={TD_STYLES}>
              {/* TODO: maybe negation checkbox? */}
              <button
                onClick={() =>
                  props.dispatch({ type: "RemoveConjunct", idx: conjunctIdx })
                }
                title="Remove Conjunct"
              >
                x
              </button>{" "}
            </td>
            <td style={TD_STYLES}>
              <strong>
                {conjunct.type === "Record"
                  ? conjunct.relation
                  : conjunct.type === "Negation"
                  ? `!${conjunct.record.relation}`
                  : "TODO: aggs"}
              </strong>
            </td>
            {props.vars.map((varName, varIdx) => {
              const path = pathToVar(conjunct, props.vars[varIdx]);
              const relation = props.relations.find((r) => r.name === name);
              const columns = relationColumns(relation);
              return (
                <td key={varName} style={TD_STYLES}>
                  <select
                    value={path ? path.join(".") : ""}
                    onChange={(evt) =>
                      props.dispatch({
                        type: "EditConjunct",
                        conjunctIdx,
                        varName,
                        attr: evt.target.value,
                      })
                    }
                  >
                    <option></option>
                    {/* TODO: make relations a dict */}
                    {columns.map((colName) => (
                      <option key={colName}>{colName}</option>
                    ))}
                  </select>
                </td>
              );
            })}
          </tr>
        );
      })}
      {/* extra row to add another conjunct */}
      <tr>
        <td style={{ borderLeft: "1px solid lightgrey" }}>
          {props.conjunction.conjuncts.length === 0 ? removeButton : null}
        </td>
        {/* delete conjunct button */}
        <td />
        <td style={TD_STYLES}>
          <select
            value={selectedToAdd}
            onChange={(evt) => {
              props.dispatch({
                type: "AddConjunct",
                conjunct: newConjunct(
                  evt.target.value,
                  props.rule,
                  props.relations
                ),
              });
              setSelectedToAdd("+");
            }}
          >
            <option>+</option>
            {props.relations.map((relation) => (
              <option key={relation.name}>{relation.name}</option>
            ))}
          </select>
        </td>
        <td
          colSpan={props.vars.length}
          style={{ borderRight: "1px solid lightgrey" }}
        ></td>
      </tr>
    </>
  );
}

type ConjunctionAction =
  | { type: "AddConjunct"; conjunct: Conjunct }
  | { type: "RemoveConjunct"; idx: number }
  | {
      type: "EditConjunct";
      conjunctIdx: number;
      varName: string;
      attr: string;
    };

function conjunctionReducer(
  state: Conjunction,
  action: ConjunctionAction
): Conjunction {
  switch (action.type) {
    case "AddConjunct":
      return {
        type: "Conjunction",
        conjuncts: [...state.conjuncts, action.conjunct],
      };
    case "RemoveConjunct":
      return {
        type: "Conjunction",
        conjuncts: removeAtIdx(state.conjuncts, action.idx),
      };
    case "EditConjunct":
      return {
        type: "Conjunction",
        conjuncts: updateAtIdx(state.conjuncts, action.conjunctIdx, (conj) => {
          switch (conj.type) {
            case "Record":
              return rec(conj.relation, {
                ...conj.attrs,
                [action.attr]: varr(action.varName),
              });
          }
        }),
      };
  }
}
