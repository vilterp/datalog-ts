import React, { useState } from "react";
import { mapObjToList } from "../../../../../util/util";
import { UIProps } from "../../../types";
import { ClientState, QueryStatus, getStateForKey } from "../client";
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
  int,
} from "../mutations/types";
import { MutationDefns, UserInput } from "../types";
import { TxnState } from "./common/txnState";
import { KVApp } from "./types";
import { TransactionList } from "./common/txnList";

function BankUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <div>
      <h3>MyBank</h3>
      <InnerContent client={client} />
    </div>
  );
}

function InnerContent(props: { client: Client }) {
  const [accounts, queryState] = useAccountList(props.client);

  if (queryState === "Loading") {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <BalanceTable client={props.client} accounts={accounts} />
      <ul>
        <li>
          <WithdrawForm client={props.client} accounts={accounts} />
        </li>
        <li>
          <DepositForm client={props.client} accounts={accounts} />
        </li>
        <li>
          <MoveForm client={props.client} accounts={accounts} />
        </li>
        <li>
          <CreateAccountForm client={props.client} />
        </li>
      </ul>
      <TransactionList client={props.client} />
    </div>
  );
}

function WithdrawForm(props: { client: Client; accounts: Account[] }) {
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
      <AccountChooser
        accounts={props.accounts}
        current={account}
        onChange={setAccount}
      />
      Amount:{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />
      <button>Withdraw</button>
    </form>
  );
}

function DepositForm(props: { client: Client; accounts: Account[] }) {
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
      <AccountChooser
        accounts={props.accounts}
        current={account}
        onChange={setAccount}
      />
      Amount:{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />
      <button>Deposit</button>
    </form>
  );
}

function MoveForm(props: { client: Client; accounts: Account[] }) {
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
      <AccountChooser
        accounts={props.accounts}
        current={fromAccount}
        onChange={setFromAccount}
      />
      To Account:{" "}
      <AccountChooser
        accounts={props.accounts}
        current={toAccount}
        onChange={setToAccount}
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

function BalanceTable(props: { client: Client; accounts: Account[] }) {
  return (
    <>
      <h4>Accounts</h4>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Balance</th>
            <th>Committed At</th>
          </tr>
        </thead>
        <tbody>
          {props.accounts.map((account) => (
            <tr key={account.name}>
              <td>{account.name}</td>
              <td>{account.balance}</td>
              <td>
                <TxnState client={props.client} txnID={account.transactionID} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function CreateAccountForm(props: { client: Client }) {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        setName("");
        props.client.runMutation({
          type: "Invocation",
          name: "createAccount",
          args: [name],
        });
      }}
    >
      Create account:{" "}
      <input value={name} onChange={(evt) => setName(evt.target.value)} />
      <button>Create</button>
    </form>
  );
}

// ==== Account list and chooser ====

function AccountChooser(props: {
  accounts: Account[];
  current: string;
  onChange: (account: string) => void;
}) {
  return (
    <select onChange={(evt) => props.onChange(evt.target.value)}>
      {props.accounts.map((account) => (
        <option key={account.name} value={account.name}>
          {account.name}
        </option>
      ))}
    </select>
  );
}

type Account = {
  name: string;
  balance: number;
  transactionID: string;
};

function useAccountList(client: Client): [Account[], QueryStatus] {
  const [queryResults, queryState] = useLiveQuery(client, "list-accounts", {
    prefix: "",
  });

  if (queryState === "Loading") {
    return [[], queryState];
  }

  return [
    mapObjToList(queryResults, (key, value) => ({
      name: key,
      balance: value.value as number,
      transactionID: value.transactionID,
    })),
    queryState,
  ];
}

// ==== Mutations ====

// TODO: is default=0 correct for everything here?
const mutations: MutationDefns = {
  createAccount: lambda(["name"], write(varr("name"), int(0))),
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
      ifExpr(
        apply(">", [varr("amount"), varr("balanceBefore")]),
        abort(str("balance not high enough")),
        write(
          varr("fromAccount"),
          apply("-", [varr("balanceBefore"), varr("amount")])
        )
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
