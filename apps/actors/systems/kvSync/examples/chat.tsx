import React, { Ref, useLayoutEffect, useRef, useState } from "react";
import { UIProps } from "../../../types";
import { ClientState } from "../client";
import { Client, makeClient, useLiveQuery } from "../hooks";
import {
  apply,
  doExpr,
  int,
  lambda,
  letExpr,
  obj,
  read,
  str,
  varr,
  write,
} from "../mutations/types";
import { MutationDefns, UserInput, VersionedValue } from "../types";
import { TxnState } from "./common/txnState";
import { KVApp } from "./types";
import { Table } from "./common/table";
import { Json } from "aws-sdk/clients/robomaker";

type Message = {
  id: number;
  seqNo: number;
  sender: string;
  message: string;
};

function ChatUI(props: UIProps<ClientState, UserInput>) {
  const [curThread, setCurThread] = useState("foo");
  const scrollRef = useRef<HTMLDivElement>();

  const client = makeClient(props);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  });

  return (
    <div>
      <table style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td valign="top" style={{ backgroundColor: "rgb(221, 255, 244)" }}>
              <ThreadList
                client={client}
                curThread={curThread}
                setCurThread={setCurThread}
                threads={EXAMPLE_THREADS}
              />
            </td>
            <td>
              <div
                ref={scrollRef}
                style={{ width: 400, height: 250, overflowY: "scroll" }}
              >
                <MessageTable threadID={curThread} client={client} />
              </div>
              <SendBox threadID={curThread} client={client} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

type MessageWithTxnID = Message & { transactionID: string };

function MessageTable(props: { threadID: string; client: Client }) {
  const [messages, messagesStatus] = useLiveQuery(
    props.client,
    `messages-${props.threadID}`,
    { prefix: `/messages/${props.threadID}` }
  );
  const [latestMessageSeen, latestMessageSeenStatus] = useLiveQuery(
    props.client,
    `latest-seen-by-${props.threadID}`,
    { prefix: `/latestMessageRead/byThread/${props.threadID}` }
  );

  if (messagesStatus === "Loading") {
    return <em>Loading...</em>;
  }

  // build index from message to users seen
  // TODO: should the DB be maintaining this index?
  const usersSeenBySeqNo: { [seqNo: string]: string[] } = {};
  Object.entries(latestMessageSeen).forEach(([key, seqNoVal]) => {
    const [_1, _2, _3, threadID, userID] = key.split("/");
    const seqNo = seqNoVal.value as string;
    const users = usersSeenBySeqNo[seqNo] || [];
    users.push(userID);
    usersSeenBySeqNo[seqNo] = users;
  });

  return (
    <>
      <Table<MessageWithTxnID>
        data={Object.values(messages)
          .sort(
            (a, b) => (a.value as Message).seqNo - (b.value as Message).seqNo
          )
          .map((vv) => ({
            ...(vv.value as Message),
            transactionID: vv.transactionID,
          }))}
        getKey={(msg) => msg.transactionID}
        columns={[
          { name: "From", render: (msg) => msg.sender },
          { name: "Message", width: 150, render: (msg) => msg.message },
          {
            name: "State",
            render: (msg) => (
              <TxnState client={props.client} txnID={msg.transactionID} />
            ),
          },
          {
            name: "Seen By",
            width: 100,
            render: (msg) =>
              (usersSeenBySeqNo[msg.seqNo] || [])
                .filter((user) => user !== props.client.state.id)
                .join(", "),
          },
        ]}
      />
    </>
  );
}

function SendBox(props: { threadID: string; client: Client }) {
  const [message, setMessage] = useState("");
  const latestSeqNo =
    props.client.state.data[`/latestMessage/${props.threadID}`];

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        setMessage("");
        props.client.runMutation("sendMessage", [props.threadID, message]);
      }}
    >
      <input
        onChange={(evt) => setMessage(evt.target.value)}
        value={message}
        size={40}
        onFocus={() => {
          if (latestSeqNo) {
            props.client.runMutation("markRead", [
              props.threadID,
              latestSeqNo.value,
            ] as Json[]);
          }
        }}
      />
      <button>Send</button>
    </form>
  );
}

function ThreadList(props: {
  client: Client;
  threads: string[];
  curThread: string;
  setCurThread: (th: string) => void;
}) {
  // TODO: this should be only for chats that this user is in
  const [latestMessage, latestMessageStatus] = useLiveQuery(
    props.client,
    "latest-messages",
    {
      prefix: "/latestMessage",
    }
  );
  const [latestMessageRead, latestMessageReadStatus] = useLiveQuery(
    props.client,
    "latest-message-read",
    {
      prefix: `/latestMessageRead/byUser/${props.client.state.id}`,
    }
  );

  return (
    <div style={{ width: 100 }}>
      <h4>Chat</h4>
      {props.threads.map((threadID) => {
        // TODO: need full keys
        const latestMessageInThread =
          latestMessage[`/latestMessage/${threadID}`];

        const key = `/latestMessageRead/byUser/${props.client.state.id}/${threadID}`;
        const latestMessageReadInThread = latestMessageRead[key];
        const hasUnread =
          latestMessageInThread?.value >
          (latestMessageReadInThread?.value || -1);
        // console.log(
        //   "ThreadList item hasUnread",
        //   props.client.state.id,
        //   latestMessageInThread,
        //   ">",
        //   latestMessageReadInThread
        // );
        return (
          <div
            key={threadID}
            onClick={() => props.setCurThread(threadID)}
            style={{
              cursor: "pointer",
              backgroundColor: threadID == props.curThread ? "lightblue" : "",
              fontWeight: hasUnread ? "bold" : "normal",
            }}
          >
            {threadID}
            {hasUnread ? "*" : ""}
          </div>
        );
      })}
    </div>
  );
}

// Schema:
//
// /messages/<ThreadID>/<MessageID> => { id, seqNo, sender, message }
// /latestMessage/<ThreadID> => <MessageID>
// /latestMessageRead/byUser/<UserID> => <MessageID>
// /latestMessageRead/byThread/<ThreadID> => <MessageID>

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
        {
          varName: "newID",
          val: apply("rand", []),
        },
      ],
      doExpr([
        write(
          apply("concat", [str("/latestMessage/"), varr("threadID")]),
          varr("newSeqNo")
        ),
        // TODO: call markRead?
        write(
          apply("concat", [
            str("/latestMessageRead/byUser/"),
            varr("curUser"),
            str("/"),
            varr("threadID"),
          ]),
          varr("newSeqNo")
        ),
        write(
          apply("concat", [
            str("/latestMessageRead/byThread/"),
            varr("threadID"),
            str("/"),
            varr("curUser"),
          ]),
          varr("newSeqNo")
        ),
        write(
          apply("concat", [
            str("/messages/"),
            varr("threadID"),
            str("/"),
            varr("newID"),
          ]),
          obj({
            id: varr("newID"),
            seqNo: varr("newSeqNo"),
            sender: varr("curUser"),
            message: varr("message"),
          })
        ),
      ])
    )
  ),
  markRead: lambda(
    ["threadID", "seqNo"],
    doExpr([
      write(
        apply("concat", [
          str("/latestMessageRead/byUser/"),
          varr("curUser"),
          str("/"),
          varr("threadID"),
        ]),
        varr("seqNo")
      ),
      write(
        apply("concat", [
          str("/latestMessageRead/byThread/"),
          varr("threadID"),
          str("/"),
          varr("curUser"),
        ]),
        varr("seqNo")
      ),
    ])
  ),
};

const EXAMPLE_THREADS = ["foo", "bar"];

export const chat: KVApp = { name: "Chat", mutations, ui: ChatUI };
