import React, { useState } from "react";
import { UIProps } from "../../../types";
import { ClientState, TransactionState } from "../client";
import { Client, makeClient, useLiveQuery } from "../hooks";
import {
  apply,
  doExpr,
  int,
  lambda,
  letExpr,
  read,
  str,
  varr,
  write,
} from "../mutations/types";
import { MutationDefns, UserInput } from "../types";
import { TxnState } from "./common";
import { KVApp } from "./types";

type Message = {
  id: number;
  sender: string;
  message: string;
  state: TransactionState;
};

function ChatUI(props: UIProps<ClientState, UserInput>) {
  const [curThread, setCurThread] = useState("foo");

  const client = makeClient(props);

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
              <MessageTable threadID={curThread} client={client} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MessageTable(props: { threadID: string; client: Client }) {
  const [messages, messagesStatus] = useLiveQuery(
    props.client,
    `messages-${props.threadID}`,
    { prefix: `/messages/${props.threadID}` }
  );
  const [message, setMessage] = useState("");

  if (messagesStatus === "Loading") {
    return (
      <p>
        <em>Loading...</em>
      </p>
    );
  }

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Sender</th>
            <th>Message</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {/* sort by date? */}
          {Object.values(messages).map((message) => {
            const msg = message.value as Message;
            return (
              <tr key={message.transactionID}>
                <td>{msg.sender}</td>
                <td>{msg.message}</td>
                <td>
                  <TxnState state={msg.state} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <form
        onSubmit={(evt) => {
          evt.preventDefault();
          setMessage("");
          props.client.runMutation({
            name: "sendMessage",
            args: [props.threadID, message],
          });
        }}
      >
        <input
          onChange={(evt) => setMessage(evt.target.value)}
          value={message}
        />
        <button>Send</button>
      </form>
    </>
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

const mutations: MutationDefns = {
  sendMessage: lambda(
    ["threadID", "message"],
    letExpr(
      [
        {
          varName: "latestSeqNo",
          val: apply("parseInt", [
            read(
              apply("concat", [str("/latestMessage/"), varr("threadID")]),
              0
            ),
          ]),
        },
        {
          varName: "newSeqNo",
          val: apply("+", [varr("latestSeqNo"), int(1)]),
        },
      ],
      doExpr([
        write(
          apply("concat", [str("/latestMessage/"), varr("threadID")]),
          varr("newSeqNo")
        ),
        write(
          apply("concat", [
            str("/latestMessageRead/"),
            varr("curUser"),
            str("/"),
            varr("threadID"),
          ]),
          varr("newSeqNo")
        ),
        write(
          apply("concat", [
            str("/messages/"),
            varr("threadID"),
            str("/"),
            varr("newSeqNo"),
          ]),
          varr("message")
        ),
      ])
    )
  ),
};

const EXAMPLE_THREADS = ["foo", "bar"];

export const chat: KVApp = { name: "Chat", mutations, ui: ChatUI };
