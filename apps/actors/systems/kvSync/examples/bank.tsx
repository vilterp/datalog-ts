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
} from "../mutation";
import { MutationDefns, UserInput } from "../types";
import { KVApp } from "./types";

const mutations: MutationDefns = {
  deposit: lambda(
    ["toAccount", "amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("toAccount")) }],
      write(
        varr("toAccount"),
        apply("+", [varr("balanceBefore"), varr("amount")])
      )
    )
  ),
  withdraw: lambda(
    ["fromAccount", "amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("fromAccount")) }],
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
        { varName: "fromBalance", val: read(varr("fromAccount")) },
        { varName: "toBalance", val: read(varr("toAccount")) },
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
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState(0);

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
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {mapObjToList(props.state.data, (key, value) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

export const bank: KVApp = { name: "Bank", mutations, ui: BankUI };
