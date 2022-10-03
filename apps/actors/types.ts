import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { makeMemoryLoader } from "../../core/loaders";
// @ts-ignore
import patterns from "./patterns.dl";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import React from "react";

// === overall ui model ===

export type State<St, Msg> = {
  systemInstances: SystemInstance<St, Msg>[];
};

// TODO: only one action... is this reducer even necessary?
export type Action<St, Msg> = {
  type: "UpdateSystemInstance";
  action: SystemInstanceAction<St, Msg>;
  instanceID: string;
};

// === system & system instance ===

export type UpdateFn<ActorState, Msg> = (
  state: ActorState,
  msg: LoadedTickInitiator<ActorState, Msg>
) => ActorResp<ActorState, Msg>;

export type System<ActorState, Msg> = {
  name: string;
  id: string;
  ui: (props: {
    state: ActorState;
    sendUserInput: (input: Msg) => void;
  }) => React.ReactElement;
  update: UpdateFn<ActorState, Msg>;
  // TODO: something about all these initial states
  initialState: Trace<ActorState>;
  initialClientState: ActorState;
  initialUserState: ActorState;
};

export type UIProps<ClientState, UserInput> = {
  state: ClientState;
  sendUserInput: (msg: UserInput) => void;
};

export type SystemInstance<ActorState, Msg> = {
  system: System<ActorState, Msg>;
  trace: Trace<ActorState>;
  clientIDs: number[];
  nextClientID: number;
};

export type SystemInstanceAction<St, Msg> =
  | {
      type: "UpdateTrace";
      action: TraceAction<St, Msg>;
    }
  | { type: "AllocateClientID" }
  | { type: "ExitClient"; clientID: number };

// === trace model ===

export type TraceAction<ActorState, Msg> =
  | {
      type: "SpawnClient";
      id: number;
      // TODO: this is a bit awkward, since these both exist on System...
      initialUserState: ActorState;
      initialClientState: ActorState;
    }
  | { type: "SendUserInput"; clientID: number; input: Msg }
  | { type: "Step"; init: AddressedTickInitiator<ActorState> };

export type Trace<ActorState> = {
  nextID: number;
  interp: AbstractInterpreter;

  // TODO: these two can be derived from the DB, which would be more elegant...
  //  putting them here is easier for now.
  latestStates: { [actorID: string]: ActorState };
};

export function initialTrace<ActorState>(): Trace<ActorState> {
  const interp = new IncrementalInterpreter(
    ".",
    makeMemoryLoader({
      "./patterns.dl": patterns,
    })
  );
  const interp2 = interp.doLoad("patterns.dl");
  return {
    latestStates: {},
    nextID: 0,
    interp: interp2,
  };
}

// TODO: DRY up all these initiators

type NonMsgTickInitiator<ActorState> =
  | { type: "timerFired"; timerID: TimerID }
  | {
      type: "spawned";
      spawningTickID: TickID;
      initialState: ActorState;
    }
  | { type: "userInput" };

export type TickInitiator<ActorState> =
  | { type: "messageReceived"; messageID: MessageID }
  | NonMsgTickInitiator<ActorState>;

export type LoadedTickInitiator<ActorState, Msg> =
  | LoadedMessageReceivedInitiator<Msg>
  | NonMsgTickInitiator<ActorState>;

export type LoadedMessageReceivedInitiator<Msg> = {
  type: "messageReceived";
  from: ActorID;
  payload: Msg;
};

export type AddressedTickInitiator<ActorState> = {
  to: ActorID;
  from: ActorID;
  init: TickInitiator<ActorState>;
};

// === ids ===

export type ActorID = string;

export type MessageID = string;

export type TimerID = string;

export type TickID = string;

// === effects and messages ===

export type ActorResp<ActorState, Message> =
  | {
      type: "continue";
      state: ActorState;
      messages: OutgoingMessage<Message>[];
    }
  | { type: "sleep"; durationMS: number; state: ActorState }
  | { type: "exit" };

export type OutgoingMessage<T> = { msg: T; to: ActorID };
