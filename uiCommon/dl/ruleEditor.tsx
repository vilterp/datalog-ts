import React, { useReducer, useState } from "react";
import { gatherVars, pathToVar } from "../../core/gatherVars";
import {
  Conjunct,
  Conjunction,
  Disjunction,
  Rec,
  rec,
  Relation,
  Rule,
} from "../../core/types";
import { intersperse, removeAtIdx, updateAtIdx } from "../../util/util";
import { TD_STYLES } from "../explorer/styles";

// === Rule ===

export function RuleEditor(props: {
  rule: Rule;
  dispatch: (a: RuleAction) => void;
  relations: Relation[];
}) {
  return (
    <table style={{ fontFamily: "monospace" }}>
      <tbody>
        <tr>
          {intersperse(
            <td>or</td>,
            props.rule.body.disjuncts.map((opt, idx) => (
              <td key={idx}>
                <ConjunctionEditor
                  head={props.rule.head}
                  conjunction={opt}
                  dispatch={(action) =>
                    props.dispatch({
                      type: "EditBody",
                      action: { type: "EditDisjunct", idx, action },
                    })
                  }
                  relations={props.relations}
                />
              </td>
            ))
          )}
          <td>or</td>
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
  head: Rec;
  conjunction: Conjunction;
  dispatch: (a: ConjunctionAction) => void;
  relations: Relation[];
}) {
  const [selectedToAdd, setSelectedToAdd] = useState("+");
  const vars = gatherVars(props.conjunction.conjuncts);
  return (
    <table style={{ borderCollapse: "collapse", fontFamily: "monospace" }}>
      <thead>
        <tr>
          <th />
          {vars.map((varName) => {
            const path = pathToVar(props.head, varName);
            return (
              <th key={varName} style={TD_STYLES}>
                {path ? path.join(".") : ""}
              </th>
            );
          })}
        </tr>
        <tr style={{ borderBottom: "1px solid black" }}>
          <th />
          {vars.map((varName) => (
            <th key={varName} style={TD_STYLES}>
              {varName}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.conjunction.conjuncts.map((conjunct, conjunctIdx) => (
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
            {vars.map((varName, varIdx) => {
              const path = pathToVar(conjunct, vars[varIdx]);
              return (
                <td key={varName} style={TD_STYLES}>
                  {path ? path.join(".") : ""}
                </td>
              );
            })}
          </tr>
        ))}
        <tr>
          <td>
            <select
              value={selectedToAdd}
              onChange={(evt) => {
                props.dispatch({
                  type: "AddConjunct",
                  conjunct: rec(evt.target.value, {}),
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
          <td colSpan={vars.length}></td>
        </tr>
      </tbody>
    </table>
  );
}

type ConjunctionAction =
  | { type: "AddConjunct"; conjunct: Conjunct }
  | { type: "RemoveConjunct"; idx: number }
  | { type: "EditConjunct"; idx: number };

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
      console.warn("TODO", action);
      return state;
  }
}
