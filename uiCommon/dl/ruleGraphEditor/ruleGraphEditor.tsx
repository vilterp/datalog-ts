import React from "react";
import { Relation, Rule } from "../../../core/types";
import * as styles from "../../explorer/styles";
import { ConjunctionGraphEditor } from "./conjunctionGraphEditor";
import {
  addDisjunct,
  conjunctionToGraph,
  editDisjunct,
  removeDisjunct,
} from "./convert";

export function RuleGraphEditor(props: {
  rule: Rule;
  setRule: (rule: Rule) => void;
  relations: Relation[];
}) {
  return (
    <table style={{ borderCollapse: "collapse" }}>
      <tbody>
        {props.rule.body.disjuncts.map((disjunct, idx) => (
          <tr key={idx} style={{ borderTop: "1px solid lightgrey" }}>
            <td
              onClick={() => props.setRule(removeDisjunct(props.rule, idx))}
              style={styles.TD_STYLES}
              valign="top"
            >
              <button>x</button>
            </td>
            <td style={styles.TD_STYLES}>
              <ConjunctionGraphEditor
                rule={props.rule}
                conjunction={disjunct}
                setConjunction={(newConjunction) =>
                  props.setRule(editDisjunct(props.rule, idx, newConjunction))
                }
                relations={props.relations}
              />
            </td>
          </tr>
        ))}
        <tr>
          <td
            colSpan={2}
            style={{ ...styles.TD_STYLES, borderTop: "1px solid lightgrey" }}
          >
            <button onClick={() => props.setRule(addDisjunct(props.rule))}>
              +
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
