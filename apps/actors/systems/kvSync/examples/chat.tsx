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
              <ThreadList
                curThread={curThread}
                setCurThread={setCurThread}
                threads={EXAMPLE_THREADS}
              />
            </td>
            <td>
              <MessageTable messages={messages} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MessageTable(props: { messages: Message[] }) {
  return (
    <table>
      <thead>
        <th>Sender</th>
        <th>Message</th>
        <th>State</th>
      </thead>
      <tbody>
        {props.messages.map((message) => (
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
  );
}

function ThreadList(props: {
  threads: string[];
  curThread: string;
  setCurThread: (th: string) => void;
}) {
  return (
    <ul>
      {props.threads.map((thread) => (
        <li
          key={thread}
          onClick={() => props.setCurThread(thread)}
          style={{
            cursor: "pointer",
            fontWeight: thread == props.curThread ? "bold" : "normal",
          }}
        >
          {thread}
        </li>
      ))}
    </ul>
  );
}

const mutations: MutationDefns = {};

export const chat: KVApp = { name: "Chat", mutations, ui: ChatUI };
