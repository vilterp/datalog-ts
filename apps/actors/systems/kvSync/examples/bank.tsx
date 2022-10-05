import React, { useEffect, useState } from "react";
import { END_KEY, START_KEY } from "../../../../../core/types";
import { mapObjToList } from "../../../../../util/util";
import { UIProps } from "../../../types";
import { ClientState } from "../client";
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
  useEffect(() => {
    props.sendUserInput({
      type: "RegisterQuery",
      query: { fromKey: START_KEY, toKey: END_KEY },
    });
  }, []);

  return (
    <div>
      <h3>MyBank</h3>
      <BalanceTable state={props.state} />
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

function BalanceTable(props: { state: ClientState }) {
  // TODO: use a query API instead of mapping over the raw data
  // useLiveQuery would be good
  return (
    <table>
      <thead>
        <tr>
          <th>Account</th>
          <th>Balance</th>
          <th>(txn state)</th>
        </tr>
      </thead>
      <tbody>
        {mapObjToList(props.state.data, (key, value) => {
          const txn = props.state.transactions[value.transactionID];
          return (
            <tr key={key}>
              <td>{key}</td>
              <td>{value.value}</td>
              <td>
                <code>
                  {JSON.stringify(txn ? txn.state : { type: "FromServer" })}
                </code>
              </td>
            </tr>
          );
        })}
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
