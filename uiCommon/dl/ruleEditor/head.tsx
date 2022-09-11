import React, { useLayoutEffect, useRef, useState } from "react";
import { rec, Rec, varr } from "../../../core/types";
import { pairsToObj, removeAtIdx, updateAtIdx } from "../../../util/util";
import { TD_STYLES } from "../../explorer/styles";
import { HeadAction, Order, RuleAction } from "./types";

export function TableHead(props: {
  order: Order;
  dispatch: (a: RuleAction) => void;
}) {
  const order = props.order;

  return (
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
  );
}

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
