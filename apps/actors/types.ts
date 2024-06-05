import { AbstractInterpreter } from "../../core/abstractInterpreter";
import React from "react";

// === overall ui model ===

export type State<St, Msg> = {
  networkLatency: number;
  systemInstances: SystemInstance<St, Msg>[];
};

// TODO: only one action... is this reducer even necessary?
export type Action<St, Msg> =
  | {
      type: "UpdateSystemInstance";
      action: SystemInstanceAction<St, Msg>;
      instanceID: string;
    }
  | { type: "ChangeNetworkLatency"; newLatency: number };

// === system & system instance ===

export type UpdateFn<ActorState, Msg> = (
  state: ActorState,
  msg: LoadedTickInitiator<ActorState, Msg>
) => ActorResp<ActorState, Msg>;

export type MessageToClient<Msg> = {
  clientID: ActorID;
  message: Msg;
};

export type ChooseFn<ActorState, Msg> = (
  state: SystemInstance<ActorState, Msg>,
  randomSeed: number
) => [MessageToClient<Msg>, number];

export type System<ActorState, Msg> = {
  name: string;
  id: string;
  ui: (props: UIProps<ActorState, Msg>) => React.ReactElement;
  update: UpdateFn<ActorState, Msg>;
  // TODO: something about all these initial states
  getInitialState: (interp: AbstractInterpreter) => Trace<ActorState>;
  initialClientState: (id: string) => ActorState;
  initialUserState: ActorState;
  chooseNextMove?: ChooseFn<ActorState, Msg>;
};

export type UIProps<ClientState, UserInput> = {
  state: ClientState;
  sendUserInput: (msg: UserInput) => void;
};

export type SystemInstance<ActorState, Msg> = {
  system: System<ActorState, Msg>;
  trace: Trace<ActorState>;
  clientIDs: string[];
  nextClientID: number;
};

export type SystemInstanceAction<St, Msg> =
  | {
      type: "UpdateTrace";
      action: TraceAction<St, Msg>;
    }
  | { type: "AllocateClientID" }
  | { type: "ExitClient"; clientID: string }
  | { type: "Explore"; steps: number };

// === trace model ===

export type TraceAction<ActorState, Msg> =
  | {
      type: "SpawnClient";
      id: string;
      // TODO: this is a bit awkward, since these both exist on System...
      initialUserState: ActorState;
      initialClientState: ActorState;
    }
  | { type: "SendUserInput"; clientID: string; input: Msg }
  | { type: "Step"; init: AddressedTickInitiator<ActorState> };

export type Trace<ActorState> = {
  nextID: number;
  interp: AbstractInterpreter;

  // TODO: these two can be derived from the DB, which would be more elegant...
  //  putting them here is easier for now.
  latestStates: { [actorID: string]: ActorState };
};

export function initialTrace<ActorState>(
  interp: AbstractInterpreter
): Trace<ActorState> {
  const interp2 = interp.doLoad("patterns.dl");
  return {
    latestStates: {},
    nextID: 0,
    interp: interp2,
  };
}

// TODO: DRY up all these initiators

export type TickInitiator<ActorState> =
  | { type: "messageReceived"; messageID: MessageID }
  | NonMsgTickInitiator<ActorState>;

type NonMsgTickInitiator<ActorState> =
  | { type: "timerFired"; timerID: TimerID }
  | {
      type: "spawned";
      spawningTickID: TickID;
      initialState: ActorState;
    }
  | { type: "userInput" };

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

export type TickID = number;

// === effects and messages ===

export type ActorResp<ActorState, Message> =
  | {
      type: "continue";
      state: ActorState;
      messages: OutgoingMessage<Message>[];
    }
  | { type: "sleep"; durationMS: number; state: ActorState }
  | { type: "exit" };

// TODO: add "responding to" message id?
export type OutgoingMessage<T> = { msg: T; to: ActorID };
