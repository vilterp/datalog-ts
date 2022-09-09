import React, { useState } from "react";
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
  Rule,
  varr,
} from "../../core/types";
import {
  intersperseIdx,
  pairsToObj,
  removeAtIdx,
  updateAtIdx,
} from "../../util/util";
import { TD_STYLES as TD_STYLE } from "../explorer/styles";
import { BareTerm } from "../dl/replViews";

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

  return (
    <table style={{ borderCollapse: "collapse", fontFamily: "monospace" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid black" }}>
          {/* 'or' control */}
          <th />
          {/* delete conjunct button */}
          <th />
          {/* conjunct name */}
          <th />
          {order.map((pair, idx) => {
            return (
              <th key={idx} style={TD_STYLE}>
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
          <th />
          <th />
          <th />
          {order.map((pair, idx) => (
            <th key={idx} style={TD_STYLE}>
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
          <td colSpan={vars.length + 3} style={TD_STYLE}>
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
        {results.map((result, idx) => {
          console.log("ResultTable", { result, vars });
          return (
            <tr key={idx}>
              <td colSpan={3} />
              {vars.map((varName) => {
                const value = result.bindings[varName];
                return (
                  <td key={varName}>
                    {value ? <BareTerm term={value} /> : "missing"}
                  </td>
                );
              })}
            </tr>
          );
        })}
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
            <td style={TD_STYLE}>
              {conjunctIdx === 0 ? <>{removeButton}</> : null}
            </td>
            <td style={TD_STYLE}>
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
            <td style={TD_STYLE}>
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
                <td key={varName} style={TD_STYLE}>
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
        <td style={TD_STYLE}>
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
