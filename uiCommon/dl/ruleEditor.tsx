import React, { useReducer } from "react";
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
          {props.rule.body.opts.map((opt, idx) => (
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
        opts: [...disjunction.opts, { type: "Conjunction", clauses: [] }],
      };
    case "RemoveDisjunct":
      return {
        type: "Disjunction",
        opts: removeAtIdx(disjunction.opts, action.idx),
      };
    case "EditDisjunct":
      return {
        type: "Disjunction",
        opts: updateAtIdx(disjunction.opts, action.idx, (conj) =>
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
  return <p>Hello world</p>;
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
