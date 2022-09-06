import React, { useState } from "react";
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
  Rule,
  varr,
} from "../../core/types";
import {
  intersperse,
  intersperseIdx,
  mapListToObj,
  mapObj,
  pairsToObj,
  removeAtIdx,
  updateAtIdx,
} from "../../util/util";
import { TD_STYLES } from "../explorer/styles";

// === Rule ===

export function RuleEditor(props: {
  rule: Rule;
  dispatch: (a: RuleAction) => void;
  relations: Relation[];
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

  return (
    <table style={{ borderCollapse: "collapse", fontFamily: "monospace" }}>
      <thead>
        <tr>
          <th /> {/* 'or' control */}
          <th /> {/* relation name */}
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
                >
                  x
                </button>
              </th>
            );
          })}
        </tr>
        {/* <tr style={{ borderBottom: "1px solid black" }}>
          <th />
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
        <tr>
          <td colSpan={vars.length + 2}>
            or{" "}
            <button
              onClick={() =>
                props.dispatch({
                  type: "EditBody",
                  action: { type: "AddDisjunct" },
                })
              }
            >
              +
            </button>
          </td>
        </tr>
      </tbody>
    </table>
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
  console.log("headReducer", { head, action });
  switch (action.type) {
    case "EditName":
      return rec(action.name, head.attrs);
    // TODO: DRY these two up
    case "EditAttr": {
      const newOrder = updateAtIdx(action.order, action.idx, (pair) => ({
        varName: pair.varName,
        attr: action.newAttr,
      }));
      return helper(head.relation, newOrder);
    }
    case "EditVar": {
      const newOrder = updateAtIdx(action.order, action.idx, (pair) => ({
        varName: action.newVar,
        attr: pair.attr,
      }));
      return helper(head.relation, newOrder);
    }
    case "DeleteColumn": {
      const newOrder = removeAtIdx(action.order, action.idx);
      return helper(head.relation, newOrder);
    }
  }
}

function helper(relation: string, newOrder: Order): Rec {
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

  return (
    <>
      {props.conjunction.conjuncts.map((conjunct, conjunctIdx) => {
        const name = conjunctName(conjunct);
        return (
          <tr key={conjunctIdx}>
            <td>
              {conjunctIdx === 0 ? (
                props.disjunctIdx > 0 ? (
                  <>
                    <button onClick={() => props.removeDisjunct()}>x</button> or
                  </>
                ) : null
              ) : (
                ""
              )}
            </td>
            <td style={TD_STYLES}>
              {/* TODO: maybe negation checkbox? */}
              <button
                onClick={() =>
                  props.dispatch({ type: "RemoveConjunct", idx: conjunctIdx })
                }
              >
                x
              </button>{" "}
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
              const columns = relationColumns(
                props.relations.find((r) => r.name === name)
              );
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
      <tr>
        <td />
        <td>
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
        <td colSpan={props.vars.length}></td>
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
