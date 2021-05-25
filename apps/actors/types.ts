import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { makeMemoryLoader } from "../../core/loaders";
// @ts-ignore
import patterns from "./patterns.dl";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import React from "react";

// === overall model ===

export type Trace<ActorState> = {
  nextID: number;
  interp: AbstractInterpreter;

  // TODO: these two can be derived from the DB, which would be more elegant...
  //  putting them here is easier for now.
  latestStates: { [actorID: string]: ActorState };
  queue: AddressedTickInitiator<ActorState>[];
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
    queue: [],
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

// TODO: latency

// === run the thing ===

export type UpdateFn<ActorState, Msg> = (
  state: ActorState,
  msg: LoadedTickInitiator<ActorState, Msg>
) => ActorResp<ActorState, Msg>;

export type Scenario<ActorState, Msg> = {
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
