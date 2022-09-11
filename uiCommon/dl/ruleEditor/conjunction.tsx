import React from "react";
import { useState } from "react";
import {
  conjunctName,
  newConjunct,
  pathToVar,
  relationColumns,
} from "./schemaUtils";
import { Conjunction, rec, Relation, Rule, varr } from "../../../core/types";
import { removeAtIdx, updateAtIdx } from "../../../util/util";
import { TD_STYLES } from "../../explorer/styles";
import { ConjunctionAction } from "./types";

export function ConjunctionEditor(props: {
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

export function conjunctionReducer(
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
