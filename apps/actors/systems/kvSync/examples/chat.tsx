import React from "react";
import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { MutationDefns, UserInput } from "../types";
import { KVApp } from "./types";

function ChatUI(props: UIProps<ClientState, UserInput>) {
  return (
    <div>
      <h3>Chat</h3>
    </div>
  );
}

const mutations: MutationDefns = {};

export const chat: KVApp = { name: "Chat", mutations, ui: ChatUI };
