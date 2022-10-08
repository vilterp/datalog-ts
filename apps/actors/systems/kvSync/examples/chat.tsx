import React from "react";
import { UIProps } from "../../../types";
import { ClientState, TransactionState } from "../client";
import { MutationDefns, UserInput } from "../types";
import { TxnState } from "./common";
import { KVApp } from "./types";

function ChatUI(props: UIProps<ClientState, UserInput>) {
  const threads = ["foo", "bar"];
  const messages: {
    id: number;
    sender: string;
    message: string;
    state: TransactionState;
  }[] = [
    {
      id: 1,
      message: "hello world",
      sender: "Pete",
      state: { type: "Committed", serverTimestamp: 2 },
    },
  ];
  return (
    <div>
      <h3>Chat</h3>
      <table>
        <tbody>
          <tr>
            <td>
              <ul>
                {threads.map((thread) => (
                  <li key={thread}>{thread}</li>
                ))}
              </ul>
            </td>
            <td>
              <table>
                <thead>
                  <th>Sender</th>
                  <th>Message</th>
                  <th>State</th>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr key={message.id}>
                      <td>{message.sender}</td>
                      <td>{message.message}</td>
                      <td>
                        <TxnState state={message.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const mutations: MutationDefns = {};

export const chat: KVApp = { name: "Chat", mutations, ui: ChatUI };
