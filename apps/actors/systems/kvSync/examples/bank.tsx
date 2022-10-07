import React, { useEffect, useState } from "react";
import { END_KEY, START_KEY } from "../../../../../core/types";
import { mapObjToList } from "../../../../../util/util";
import { UIProps } from "../../../types";
import { ClientState, getStateForKey, TransactionState } from "../client";
import { useLiveQuery } from "../hooks";
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
import { KVApp } from "./types";

function BankUI(props: UIProps<ClientState, UserInput>) {
  return (
    <div>
      <h3>MyBank</h3>
      <BalanceTable state={props.state} sendUserInput={props.sendUserInput} />
      <ul>
        <li>
          <WithdrawForm
            sendUserInput={props.sendUserInput}
            state={props.state}
          />
        </li>
        <li>
          <DepositForm
            sendUserInput={props.sendUserInput}
            state={props.state}
          />
        </li>
        <li>
          <MoveForm sendUserInput={props.sendUserInput} state={props.state} />
        </li>
      </ul>
    </div>
  );
}

function WithdrawForm(props: UIProps<ClientState, UserInput>) {
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState(0);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.sendUserInput({
          type: "RunMutation",
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

function DepositForm(props: UIProps<ClientState, UserInput>) {
  const [account, setAccount] = useState("foo");
  const [amount, setAmount] = useState(10);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.sendUserInput({
          type: "RunMutation",
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

function MoveForm(props: UIProps<ClientState, UserInput>) {
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState(0);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.sendUserInput({
          type: "RunMutation",
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

function BalanceTable(props: UIProps<ClientState, UserInput>) {
  const [queryResults, queryState] = useLiveQuery(
    props.state,
    "list-accounts",
    { fromKey: START_KEY, toKey: END_KEY },
    props.sendUserInput
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
        {mapObjToList(queryResults, (key, value) => {
          const txnState = getStateForKey(props.state, key);
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>{value.value}</td>
              <td>
                <TxnState state={txnState} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TxnState(props: { state: TransactionState }) {
  switch (props.state.type) {
    case "Pending":
      return <></>;
    case "Committed":
      return <>{props.state.serverTimestamp}</>;
    case "Aborted":
      return <>(!)</>;
  }
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
