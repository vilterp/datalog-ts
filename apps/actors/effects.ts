import { ActorID, ActorResp, IncomingMessage } from "./types";

export function reply<ServerState, Req, Resp>(
  newSt: ServerState,
  msg: IncomingMessage<Req>,
  resp: Resp
): ActorResp<ServerState, Resp> {
  return {
    type: "continue",
    state: newSt,
    messages: [{ to: msg.from, msg: resp }],
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
  msg: Msg,
  to: ActorID
): ActorResp<State, Msg> {
  return {
    type: "continue",
    state: newState,
    messages: [{ to, msg }],
  };
}

export function update<State, Msg>(newSt: State): ActorResp<State, Msg> {
  return {
    type: "continue",
    state: newSt,
    messages: [],
  };
}

export function exit<State, Message>(): ActorResp<State, Message> {
  return { type: "exit" };
}
