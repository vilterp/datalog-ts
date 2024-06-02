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
import { Table } from "./common/table";
import { Json } from "aws-sdk/clients/robomaker";

function BankUI(props: UIProps<ClientState, UserInput>) {
  const client = makeClient(props);

  return (
    <div style={{ padding: 10 }}>
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
      <h4>Operations</h4>

      <table>
        <tbody>
          <WithdrawForm client={props.client} accounts={accounts} />
          <DepositForm client={props.client} accounts={accounts} />
          <MoveForm client={props.client} accounts={accounts} />
          <CreateAccountForm client={props.client} />
        </tbody>
      </table>

      <TransactionList client={props.client} />
    </div>
  );
}

function WithdrawForm(props: { client: Client; accounts: Account[] }) {
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState(10);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation("Withdraw", [account, amount] as Json[]);
      }}
    >
      Withdraw{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />{" "}
      from account{" "}
      <AccountChooser
        accounts={props.accounts}
        current={account}
        onChange={setAccount}
      />{" "}
      <button>Submit</button>
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
        props.client.runMutation("Deposit", [account, amount] as Json[]);
      }}
    >
      Deposit{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />{" "}
      into account{" "}
      <AccountChooser
        accounts={props.accounts}
        current={account}
        onChange={setAccount}
      />{" "}
      <button>Submit</button>
    </form>
  );
}

function MoveForm(props: { client: Client; accounts: Account[] }) {
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState(10);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.client.runMutation("Transfer", [
          fromAccount,
          toAccount,
          amount,
        ] as Json[]);
      }}
    >
      Move{" "}
      <input
        value={amount}
        onChange={(evt) => setAmount(parseInt(evt.target.value))}
      />{" "}
      from account{" "}
      <AccountChooser
        accounts={props.accounts}
        current={fromAccount}
        onChange={setFromAccount}
      />{" "}
      to account{" "}
      <AccountChooser
        accounts={props.accounts}
        current={toAccount}
        onChange={setToAccount}
      />{" "}
      <button>Submit</button>
    </form>
  );
}

function BalanceTable(props: { client: Client; accounts: Account[] }) {
  return (
    <>
      <h4>Accounts</h4>
      <Table<Account>
        columns={[
          { name: "Account", render: (account) => account.name },
          { name: "Balance", render: (account) => account.balance },
          {
            name: "State",
            render: (account) => (
              <TxnState client={props.client} txnID={account.transactionID} />
            ),
          },
        ]}
        data={props.accounts}
        getKey={(account) => account.name}
      />
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
        props.client.runMutation("CreateAccount", [name]);
      }}
    >
      Create account{" "}
      <input value={name} onChange={(evt) => setName(evt.target.value)} />{" "}
      <button>Submit</button>
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
      <option key=""></option>
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
  CreateAccount: lambda(["name"], write(varr("name"), int(0))),
  Deposit: lambda(
    ["toAccount", "amount"],
    letExpr(
      [{ varName: "balanceBefore", val: read(varr("toAccount"), 0) }],
      write(
        varr("toAccount"),
        apply("+", [varr("balanceBefore"), varr("amount")])
      )
    )
  ),
  Withdraw: lambda(
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
  Transfer: lambda(
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
