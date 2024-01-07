import React, { useState } from "react";
import { mapObjToList } from "../../../../../util/util";
import { UIProps } from "../../../types";
import { ClientState, getStateForKey } from "../client";
import { Client, makeClient, useLiveQuery } from "../hooks";
import {
  apply,
  read,
  varr,
  letExpr,
  ifExpr,
  lambda,
  abort,
  str,
  write,
  doExpr,
} from "../mutations/types";
import { MutationDefns, UserInput } from "../types";
import { TxnState } from "./common/txnState";
import { KVApp } from "./types";

function BankUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <div>
      <h3>MyBank</h3>
      <BalanceTable client={client} />
      <ul>
        <li>
          <WithdrawForm client={client} />
        </li>
        <li>
          <DepositForm client={client} />
        </li>
        <li>
          <MoveForm client={client} />
        </li>
      </ul>
    </div>
  );
}

function WithdrawForm(props: { client: Client }) {
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState(0);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation({
          type: "Invocation",
          name: "withdraw",
          args: [account, amount],
        });
      }}
    >
      Account:{" "}
      <input value={account} onChange={(evt) => setAccount(evt.target.value)} />
      Amount:{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />
      <button>Withdraw</button>
    </form>
  );
}

function DepositForm(props: { client: Client }) {
  const [account, setAccount] = useState("foo");
  const [amount, setAmount] = useState(10);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation({
          type: "Invocation",
          name: "deposit",
          args: [account, amount],
        });
      }}
    >
      Account:{" "}
      <input value={account} onChange={(evt) => setAccount(evt.target.value)} />
      Amount:{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />
      <button>Deposit</button>
    </form>
  );
}

function MoveForm(props: { client: Client }) {
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState(0);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation({
          type: "Invocation",
          name: "move",
          args: [fromAccount, toAccount, amount],
        });
      }}
    >
      From Account:{" "}
      <input
        value={fromAccount}
        onChange={(evt) => setFromAccount(evt.target.value)}
      />
      To Account:{" "}
      <input
        value={toAccount}
        onChange={(evt) => setToAccount(evt.target.value)}
      />
      Amount:{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />
      <button>Move</button>
    </form>
  );
}

function BalanceTable(props: { client: Client }) {
  const [queryResults, queryState] = useLiveQuery(
    props.client,
    "list-accounts",
    { prefix: "" }
  );

  if (queryState === "Loading") {
    return (
      <div>
        <em>Loading...</em>
      </div>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Account</th>
          <th>Balance</th>
          <th>Committed At</th>
        </tr>
      </thead>
      <tbody>
        {mapObjToList(queryResults, (key, value) => (
          <tr key={key}>
            <td>{key}</td>
            <td>{JSON.stringify(value.value)}</td>
            <td>
              <TxnState client={props.client} txnID={value.transactionID} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// TODO: is default=0 correct for everything here?
const mutations: MutationDefns = {
  deposit: lambda(
    ["toAccount", "amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("toAccount"), 0) }],
      write(
        varr("toAccount"),
        apply("+", [varr("balanceBefore"), varr("amount")])
      )
    )
  ),
  withdraw: lambda(
    ["fromAccount", "amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("fromAccount"), 0) }],
      write(
        varr("fromAccount"),
        apply("-", [varr("balanceBefore"), varr("amount")])
      )
    )
  ),
  move: lambda(
    ["fromAccount", "toAccount", "amount"],
    letExpr(
      [
        { varName: "fromBalance", val: read(varr("fromAccount"), 0) },
        { varName: "toBalance", val: read(varr("toAccount"), 0) },
      ],
      ifExpr(
        apply(">", [varr("amount"), varr("fromBalance")]),
        abort(str("balance not high enough")),
        doExpr([
          write(
            varr("fromAccount"),
            apply("-", [varr("fromBalance"), varr("amount")])
          ),
          write(
            varr("toAccount"),
            apply("+", [varr("toBalance"), varr("amount")])
          ),
        ])
      )
    )
  ),
};

export const bank: KVApp = { name: "Bank", mutations, ui: BankUI };
