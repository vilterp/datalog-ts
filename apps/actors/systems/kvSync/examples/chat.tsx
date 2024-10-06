import React, { Ref, useLayoutEffect, useRef, useState } from "react";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus } from "../client";
import { Client, makeClient, useLiveQuery } from "../hooks";
import { TSMutationDefns, UserInput } from "../types";
import { TxnState } from "../uiCommon/txnState";
import { KVApp } from "./types";
import { Inspector } from "../uiCommon/inspector";
import { LoggedIn, LoginWrapper } from "../uiCommon/loginWrapper";
import { Table } from "../../../../../uiCommon/generic/table";
import { DBCtx, QueryCtx, Schema, useTablePointQuery } from "../indexes";

function ChatUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <LoginWrapper
      client={client}
      loggedIn={(user) => <ChatUIInner client={client} user={user} />}
    />
  );
}

function ChatUIInner(props: { client: Client; user: string }) {
  const client = props.client;

  const [curThread, setCurThread] = useState("foo");
  const scrollRef = useRef<HTMLDivElement>();

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
                user={props.user}
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
                <MessageTable
                  threadID={curThread}
                  client={client}
                  user={props.user}
                />
              </div>
              <SendBox threadID={curThread} client={client} />
            </td>
          </tr>
        </tbody>
      </table>
      <Inspector client={client} />
    </div>
  );
}

type MessageWithTxnID = Message & { transactionID: string };

function MessageTable(props: {
  threadID: string;
  client: Client;
  user: string;
}) {
  const ctx: QueryCtx = { client: props.client, schema };
  const [messages, messagesStatus] = useTablePointQuery(
    ctx,
    "messages",
    "threadID",
    props.threadID
  );
  const [latestMessageSeen, latestMessageSeenStatus] = useTablePointQuery(
    ctx,
    "latestMessageRead",
    "threadID",
    props.threadID
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
                .filter((user) => user !== props.user)
                .join(", "),
          },
        ]}
      />
    </>
  );
}

function SendBox(props: { threadID: string; client: Client }) {
  const [message, setMessage] = useState("");
  const [latestSeqNo, status] = useLatestSeqNo(props.client, props.threadID);

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
          if (status === "Online") {
            props.client.runMutation("markRead", [props.threadID, latestSeqNo]);
          } else {
            console.warn(
              "SendBox: not marking read because query status is",
              status
            );
          }
        }}
      />
      <button>Send</button>
    </form>
  );
}

// TODO: make these easier to write
function useLatestSeqNo(
  client: Client,
  threadID: string
): [number, QueryStatus] {
  const ctx: QueryCtx = { client, schema };
  const [results, status] = useTablePointQuery(ctx, "channels", "id", threadID);
  if (status === "Loading") {
    return [0, status];
  }
  const result = results[`/channels/${threadID}`];
  if (!result) {
    return [0, status];
  }
  return [result.value as number, status];
}

function ThreadList(props: {
  client: Client;
  user: string; // TODO: get from client
  threads: string[];
  curThread: string;
  setCurThread: (th: string) => void;
}) {
  const ctx: QueryCtx = { client: props.client, schema };

  // TODO: this should be only for chats that this user is in
  const [latestMessage, latestMessageStatus] = useLiveQuery(
    props.client,
    "latest-messages",
    {
      prefix: "/channels",
    }
  );

  const [latestMessageRead, latestMessageReadStatus] = useLiveQuery(
    props.client,
    "latest-message-read",
    {
      prefix: `/latestMessageRead/by_user/${props.user}`,
    }
  );

  return (
    <div style={{ width: 100 }}>
      <h4>Chat</h4>
      <LoggedIn client={props.client} user={props.user} />
      {props.threads.map((threadID) => {
        // TODO: need full keys
        const latestMessageInThread =
          latestMessage[`/latestMessage/${threadID}`];

        const key = `/latestMessageRead/byUser/${props.user}/${threadID}`;
        const latestMessageReadInThread = latestMessageRead[key];
        const numUnread =
          ((latestMessageInThread?.value as number) || 0) -
          ((latestMessageReadInThread?.value as number) || 0);

        const hasUnread = numUnread > 0;
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
            {hasUnread ? ` (${numUnread})` : ""}
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

type Message = {
  id: number;
  seqNo: number;
  sender: string;
  message: string;
};

type Channel = {
  id: string;
  name: string;
  latestMessageID: string;
};

type LatestMessageRead = {
  userID: string;
  threadID: string;
  messageID: string;
};

const schema: Schema = {
  messages: {
    primaryKey: ["threadID", "id"],
    fields: {
      id: { type: "string" },
      threadID: { type: "string" },
      seqNo: { type: "number" },
      sender: { type: "string" },
      message: { type: "string" },
    },
    indexes: {
      threadID: true,
    },
  },
  channels: {
    primaryKey: ["id"],
    fields: {
      id: { type: "string" },
      name: { type: "string" },
      latestMessageID: { type: "string" },
    },
    indexes: {},
  },
  latestMessageRead: {
    primaryKey: ["userID", "threadID"],
    fields: {
      userID: { type: "string" },
      threadID: { type: "string" },
      messageID: { type: "string" },
    },
    indexes: {
      userID: true,
      threadID: true,
    },
  },
};

const mutations: TSMutationDefns = {
  sendMessage: (ctx, [threadID, message]) => {
    const db = new DBCtx(schema, ctx);

    const channel = db.read("channels", "id", threadID) as Channel;
    const latestSeqNo = channel.latestMessageID;
    const newSeqNo = latestSeqNo + 1;
    const newID = ctx.rand();

    db.update("channels", {
      id: threadID,
      latestMessageID: newID,
    });

    db.update("latestMessageRead", {
      userID: ctx.curUser,
      threadID,
      messageID: newID,
    });

    db.insert("messages", {
      id: newID,
      threadID,
      seqNo: newSeqNo,
      sender: ctx.curUser,
      message,
    });
  },
  markRead: (ctx, [threadID, seqNo]) => {
    const db = new DBCtx(schema, ctx);

    db.update("latestMessageRead", {
      userID: ctx.curUser,
      threadID,
      messageID: seqNo,
    });
  },
};

const EXAMPLE_THREADS = ["foo", "bar"];

export const chat: KVApp = { name: "Chat", mutations, ui: ChatUI };
