import {
  ActorID,
  ActorResp,
  LoadedMessageReceivedInitiator,
  OutgoingMessage,
} from "./types";

export function updateAndSend<ActorState, Msg>(
  newState: ActorState,
  messages: OutgoingMessage<Msg>[]
): ActorResp<ActorState, Msg> {
  return {
    type: "continue",
    state: newState,
    messages,
  };
}

export function reply<ServerState, Req, Resp>(
  init: LoadedMessageReceivedInitiator<Req>,
  newSt: ServerState,
  resp: Resp
): ActorResp<ServerState, Resp> {
  return {
    type: "continue",
    state: newSt,
    messages: [{ to: init.from, msg: resp }],
  };
}

export function sleep<State, Msg>(
  newState: State,
  durationMS: number
): ActorResp<State, Msg> {
  return {
    type: "sleep",
    durationMS,
    state: newState,
  };
}

export function send<State, Msg>(
  newState: State,
  to: ActorID,
  msg: Msg
): ActorResp<State, Msg> {
  return {
    type: "continue",
    state: newState,
    messages: [{ to, msg }],
  };
}

export function updateState<State, Msg>(newSt: State): ActorResp<State, Msg> {
  return {
    type: "continue",
    state: newSt,
    messages: [],
  };
}

export function doNothing<State, Msg>(st: State): ActorResp<State, Msg> {
  return updateState(st);
}

export function exit<State, Message>(): ActorResp<State, Message> {
  return { type: "exit" };
}
