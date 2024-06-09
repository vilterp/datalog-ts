import { Json } from "../../../../util/json";
import { InterpreterState } from "./mutations/builtins";
import { Lambda } from "./mutations/types";

export type VersionedValue = {
  value: Json;
  transactionID: string;
};

export type KVData = { [key: string]: VersionedValue };

export type UserInput =
  | { type: "Signup"; username: string; password: string }
  | { type: "Login"; username: string; password: string }
  | { type: "Logout" }
  | { type: "RunMutation"; invocation: MutationInvocation }
  | { type: "RegisterQuery"; id: string; query: Query }
  | { type: "CancelTransaction"; id: string };

export type MsgToServer =
  | SignupRequest
  | LogInRequest
  | {
      type: "AuthenticatedRequest";
      token: string;
      request: AuthenticatedRequest;
    };

export type AuthenticatedRequest =
  | LogOutRequest
  | LiveQueryRequest
  | MutationRequest;

export type MsgToClient = MsgFromServer | UserInput;

type MsgFromServer =
  | SignupResponse
  | LogInResponse
  | LogOutResponse
  | UnauthorizedError
  | MutationResponse
  | LiveQueryUpdate
  | LiveQueryResponse;

type UnauthorizedError = {
  type: "UnauthorizedError";
};

// Login / Logout

type SignupRequest = {
  type: "SignupRequest";
  username: string;
  password: string;
};

type SignupResponse = {
  type: "SignupResponse";
  response: { type: "Success"; token: string } | { type: "Failure" };
};

type LogInRequest = {
  type: "LogInRequest";
  username: string;
  password: string;
};

type LogInResponse = {
  type: "LogInResponse";
  response: { type: "Success"; token: string } | { type: "Failure" };
};

type LogOutRequest = {
  type: "LogOutRequest";
};

type LogOutResponse = {
  type: "LogOutResponse";
};

// Mutations & Queries

export type MutationDefns = { [name: string]: Lambda };

export type Query = { prefix: string };

export type LiveQueryRequest = {
  type: "LiveQueryRequest";
  id: string;
  query: Query;
};

// Full trace

export type Trace = TraceOp[];

export type TraceOp = ReadOp | WriteOp;

export type WriteOp = {
  type: "Write";
  key: string;
  desc: WriteDesc;
};

export type ReadOp = { type: "Read"; key: string; transactionID: string };

export type WriteDesc =
  | { type: "Insert"; after: Json }
  | { type: "Update"; before: Json; after: Json }
  | { type: "Delete"; before: Json };

// Mutations

export type MutationRequest = {
  type: "MutationRequest";
  txnID: string;
  interpState: InterpreterState;
  invocation: MutationInvocation;
  trace: Trace;
};

export type MutationResponse = {
  type: "MutationResponse";
  txnID: string;
  payload:
    | {
        type: "Accept";
        timestamp: number;
      }
    | {
        type: "Reject";
        timestamp: number;
        serverTrace: Trace;
        reason: AbortReason;
      };
};

export type AbortReason =
  | { type: "FailedOnClient"; reason: Json }
  | { type: "FailedOnServer"; failure: ServerTransactionFailure };

type ServerTransactionFailure =
  | { type: "TraceDoesntMatch" }
  | { type: "LogicError"; reason: Json };

export type TransactionMetadata = {
  [id: string]: { serverTimestamp: number; invocation: MutationInvocation };
};

export type LiveQueryUpdate = {
  type: "LiveQueryUpdate";
  clientID: string; // TODO: this shouldn't be part of the payload
  transactionMetadata: TransactionMetadata;
  updates: KeyUpdate[];
};

export type LiveQueryResponse = {
  type: "LiveQueryResponse";
  id: string;
  results: { [key: string]: VersionedValue };
  transactionMetadata: TransactionMetadata;
};

type KeyUpdate =
  | {
      type: "Updated";
      key: string;
      value: VersionedValue;
    }
  | { type: "Deleted"; key: string };

export type MutationInvocation = {
  type: "Invocation";
  name: string;
  args: Json[];
};
