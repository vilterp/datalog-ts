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
  rec,
  Relation,
  Rule,
  varr,
} from "../../core/types";
import { intersperse, removeAtIdx, updateAtIdx } from "../../util/util";
import { TD_STYLES } from "../explorer/styles";

// === Rule ===

export function RuleEditor(props: {
  rule: Rule;
  dispatch: (a: RuleAction) => void;
  relations: Relation[];
}) {
  const vars = gatherVars(props.rule);

  return (
    <table style={{ borderCollapse: "collapse", fontFamily: "monospace" }}>
      <thead>
        <tr>
          <th />
          {vars.map((varName) => {
            const path = pathToVar(props.rule.head, varName);
            const pathStr = path ? path.join(".") : "";
            return (
              <th key={varName} style={TD_STYLES}>
                <input size={Math.max(1, pathStr.length)} value={pathStr} />
              </th>
            );
          })}
        </tr>
        <tr style={{ borderBottom: "1px solid black" }}>
          {vars.map((varName) => (
            <th key={varName} style={TD_STYLES}>
              {varName}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {intersperse(
          <tr>
            <td colSpan={vars.length + 1}>or</td>
          </tr>,
          props.rule.body.disjuncts.map((conjunction, disjunctIdx) => (
            <ConjunctionEditor
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
            />
          ))
        )}
        <tr>
          <td>
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
  | { type: "EditName"; name: string }
  | { type: "EditBody"; action: DisjunctionAction };

export function ruleReducer(rule: Rule, action: RuleAction): Rule {
  switch (action.type) {
    case "EditBody":
      return { ...rule, body: disjunctionReducer(rule.body, action.action) };
    case "EditName":
      return { ...rule, head: rec(action.name, rule.head.attrs) };
  }
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
}) {
  const [selectedToAdd, setSelectedToAdd] = useState("+");

  return (
    <>
      {props.conjunction.conjuncts.map((conjunct, conjunctIdx) => {
        const name = conjunctName(conjunct);
        return (
          <tr key={conjunctIdx}>
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
