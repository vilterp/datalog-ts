import React, { useState } from "react";
import { UIProps } from "../../../types";
import { ClientState, TransactionState } from "../client";
import { MutationDefns, UserInput } from "../types";
import { TxnState } from "./common";
import { KVApp } from "./types";

type Message = {
  id: number;
  sender: string;
  message: string;
  state: TransactionState;
};

const EXAMPLE_MESSAGES: {
  [room: string]: Message[];
} = {
  foo: [
    {
      id: 1,
      message: "hello world",
      sender: "Pete",
      state: { type: "Committed", serverTimestamp: 2 },
    },
  ],
  bar: [
    {
      id: 1,
      message: "goodbye world",
      sender: "RePete",
      state: { type: "Committed", serverTimestamp: 2 },
    },
  ],
};

const EXAMPLE_THREADS = ["foo", "bar"];

function ChatUI(props: UIProps<ClientState, UserInput>) {
  const [curThread, setCurThread] = useState("foo");
  const messages = EXAMPLE_MESSAGES[curThread];

  return (
    <div>
      <h3>Chat</h3>
      <table>
        <tbody>
          <tr>
            <td>
              <ul>
                {EXAMPLE_THREADS.map((thread) => (
                  <li
                    key={thread}
                    onClick={() => setCurThread(thread)}
                    style={{
                      cursor: "pointer",
                      fontWeight: thread == curThread ? "bold" : "normal",
                    }}
                  >
                    {thread}
                  </li>
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
