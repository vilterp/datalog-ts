import { AbstractInterpreter } from "../../core/abstractinterpreter";
import { makeMemoryLoader } from "../../core/loaders";
// @ts-ignore
import patterns from "./patterns.dl";
import { SimpleInterpreter } from "../../core/simple/interpreter";

// === overall model ===

export type Trace<ActorState, Msg> = {
  latestStates: { [actorID: string]: ActorState }; // TODO: can we get this in the DB somehow?
  nextID: number;
  interp: AbstractInterpreter;
};

export function initialTrace<ActorState, Msg>(): Trace<ActorState, Msg> {
  const interp = new SimpleInterpreter(
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
  | {
      type: "messageReceived";
      from: ActorID;
      payload: Msg;
    }
  | NonMsgTickInitiator<ActorState>;

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

export type IncomingMessage<T> = { msg: T; from: ActorID };

export type OutgoingMessage<T> = { msg: T; to: ActorID };

// TODO: latency

// === run the thing ===

export type UpdateFn<ActorState, Msg> = (
  state: ActorState,
  msg: LoadedTickInitiator<ActorState, Msg>
) => ActorResp<ActorState, Msg>;
