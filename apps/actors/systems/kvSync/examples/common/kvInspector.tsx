import React from "react";
import { Client } from "../../hooks";
import { Table } from "./table";
import { VersionedValue } from "../../types";
import { TxnState } from "./txnState";

export function KVInspector(props: { client: Client }) {
  return (
    <Table<[string, VersionedValue]>
      data={Object.entries(props.client.state.data).sort(([k1, v1], [k2, v2]) =>
        k1.localeCompare(k2)
      )}
      getKey={([key, vv]) => key}
      columns={[
        { name: "Key", render: ([key, vv]) => <code>{key}</code> },
        {
          name: "Value",
          render: ([key, vv]) => <code>{JSON.stringify(vv.value)}</code>,
        },
        {
          name: "Status",
          render: ([key, vv]) => (
            <TxnState client={props.client} txnID={vv.transactionID} />
          ),
        },
      ]}
    />
  );
}
