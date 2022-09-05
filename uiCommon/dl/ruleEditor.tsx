import React, { useReducer } from "react";
import { gatherVars, pathToVar } from "../../core/gatherVars";
import { Conjunction, Disjunction, rec, Rule } from "../../core/types";
import { removeAtIdx, updateAtIdx } from "../../util/util";

// === Rule ===

export function RuleEditor(props: {
  rule: Rule;
  dispatch: (a: RuleAction) => void;
}) {
  return (
    <table>
      <tbody>
        <tr>
          {props.rule.body.disjuncts.map((opt, idx) => (
            <td key={idx}>
              <ConjunctionEditor
                conjunction={opt}
                dispatch={(action) =>
                  props.dispatch({
                    type: "EditBody",
                    action: { type: "EditDisjunct", idx, action },
                  })
                }
              />
            </td>
          ))}
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
  conjunction: Conjunction;
  dispatch: (a: ConjunctionAction) => void;
}) {
  const vars = gatherVars(props.conjunction.conjuncts);
  return (
    <table>
      <thead>
        <tr>
          <th />
          {vars.map((varName) => (
            <th key={varName}>{varName}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.conjunction.conjuncts.map((conjunct, idx) => (
          <tr key={idx}>
            <td>
              {/* TODO: maybe negation checkbox? */}
              {conjunct.type === "Record"
                ? conjunct.relation
                : conjunct.type === "Negation"
                ? `!${conjunct.record.relation}`
                : "TODO: aggs"}
            </td>
            {vars.map((varName) => {
              const path = pathToVar(conjunct, vars[idx]);
              return <td key={varName}>{path ? path.join(".") : ""}</td>;
            })}
          </tr>
        ))}
        <tr>
          <td>
            <button onClick={() => props.dispatch({ type: "AddConjunct" })}>
              +
            </button>
          </td>
          <td colSpan={vars.length}></td>
        </tr>
      </tbody>
    </table>
  );
}

type ConjunctionAction =
  | { type: "AddConjunct" }
  | { type: "RemoveConjunct"; idx: number }
  | { type: "EditConjunct"; idx: number };

function conjunctionReducer(
  state: Conjunction,
  action: ConjunctionAction
): Conjunction {
  return state;
}
