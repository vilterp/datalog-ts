import React, { useState } from "react";
import { gatherVars, pathToVar } from "../../core/gatherVars";
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
                  removeDisjunct={() =>
                    props.dispatch({
                      type: "EditBody",
                      action: { type: "RemoveDisjunct", idx },
                    })
                  }
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
  removeDisjunct: () => void;
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
          <th>
            <button onClick={() => props.removeDisjunct()}>x</button>
          </th>
          {vars.map((varName) => (
            <th key={varName} style={TD_STYLES}>
              {varName}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
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
              {vars.map((varName, varIdx) => {
                const path = pathToVar(conjunct, vars[varIdx]);
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

function conjunctName(conjunct: Conjunct): string {
  switch (conjunct.type) {
    case "Record":
      return conjunct.relation;
    case "Negation":
      return conjunct.record.relation;
    case "Aggregation":
      return conjunct.record.relation;
  }
}

// TODO: move to core utils...?
function relationColumns(relation: Relation): string[] {
  console.log("relationColumns", relation);
  switch (relation.type) {
    case "Rule":
      return Object.keys(relation.rule.head.attrs);
    case "Table":
      return relation.columns;
  }
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
