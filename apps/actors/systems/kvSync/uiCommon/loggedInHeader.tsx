import React from "react";
import { LoggedIn } from "./loginWrapper";
import { Client } from "../hooks";

export function LoggedInHeader(props: {
  user: string;
  client: Client;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {props.children}
      <LoggedIn user={props.user} client={props.client} />
    </div>
  );
}
