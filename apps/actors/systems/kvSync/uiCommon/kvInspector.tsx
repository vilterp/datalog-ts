import React from "react";
import { Client } from "../hooks";
import { VersionedValue } from "../types";
import { TransactionState, isTxnVisible } from "../client";
import { reversed } from "../../../../../util/util";
import { Table } from "../../../../../uiCommon/generic/table";
import { getVisibleValue } from "../mvcc";

export function KVInspector(props: {
  client: Client;
  selectedTxnID: string | null;
  onSelectTxn: (txnID: string) => void;
}) {
  const isVisible = (txnID: string) => isTxnVisible(props.client.state, txnID);

  return (
    <Table<[string, VersionedValue[]]>
      data={Object.entries(props.client.state.data).sort(([k1, v1], [k2, v2]) =>
        k1.localeCompare(k2)
      )}
      getKey={([key, vvs]) => key}
      columns={[
        { name: "Key", render: ([key, vvs]) => <code>{key}</code> },
        {
          name: "Value",
          render: ([key, vvs]) => (
            <code>
              {JSON.stringify(
                getVisibleValue(isVisible, props.client.state.data, key).value
              )}
            </code>
          ),
        },
        {
          name: "Statuses",
          render: ([key, vvs]) =>
            vvs.map((vv, idx) => (
              // TODO: clicking on this should show the txn trace
              <span
                title={vv.transactionID}
                style={{
                  cursor: "pointer",
                  textDecoration:
                    vv.transactionID === props.selectedTxnID
                      ? "underline"
                      : "none",
                }}
                // TODO: currently there can be multiple writes with the same txn id
                key={`${vv.transactionID}-${idx}`}
                onClick={() => props.onSelectTxn(vv.transactionID)}
              >
                {iconForState(
                  props.client.state.transactions[vv.transactionID].state
                )}
              </span>
            )),
        },
      ]}
    />
  );
}

function iconForState(state: TransactionState) {
  switch (state.type) {
    case "Pending":
      return "🟡";
    case "Committed":
      return "✅";
    case "Aborted":
      return "❌";
  }
}
