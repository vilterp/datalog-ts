import React from "react";
import { Client } from "../../hooks";
import { Table } from "./table";
import { LiveQuery } from "../../client";

export function LiveQueryInspector(props: { client: Client }) {
  return (
    <Table<[string, LiveQuery]>
      data={Object.entries(props.client.state.liveQueries)}
      getKey={([id, lq]) => id}
      columns={[
        { name: "ID", render: ([id, _]) => id },
        { name: "Prefix", render: ([_, lq]) => <code>{lq.query.prefix}</code> },
        { name: "Status", render: ([_, lq]) => lq.status },
      ]}
    />
  );
}
