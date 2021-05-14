import { Json } from "../../util/json";
import { int, Rec, rec, str, StringLit } from "../../core/types";
import { adtToRec, dlToJson, jsonToDL } from "./conversion";
import {
  ActorResp,
  AddressedTickInitiator,
  initialTrace,
  LoadedTickInitiator,
  TickInitiator,
  Trace,
  UpdateFn,
} from "./types";

export function step<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  init: AddressedTickInitiator<ActorState>
): Trace<ActorState, Msg> {
  const newTrace: Trace<ActorState, Msg> = {
    nextID: trace.nextID,
    interp: trace.interp,
    latestStates: {
      ...trace.latestStates,
    },
  };

  const queue: AddressedTickInitiator<ActorState>[] = [init];

  while (queue.length > 0) {
    const nextInitiator = queue.shift();

    if (nextInitiator.init.type === "spawned") {
      const spawn = nextInitiator.init;
      newTrace.latestStates[nextInitiator.to] = spawn.initialState;
      const [__, newInterp] = newTrace.interp.evalStmt({
        type: "Insert",
        record: rec("actor", {
          id: str(nextInitiator.to),
          spawningTickID: str(nextInitiator.init.spawningTickID),
          initialState: jsonToDL(spawn.initialState),
        }),
      });
      newTrace.interp = newInterp;
      continue;
    }

    const curActorID = nextInitiator.to;
    const actorState = newTrace.latestStates[curActorID];
    const actorResp = update(
      actorState,
      loadTickInitiator(newTrace, nextInitiator.init)
    );

    const newTickID = newTrace.nextID;
    newTrace.nextID++;
    const [_, newInterp] = newTrace.interp.evalStmt({
      type: "Insert",
      record: rec("tick", {
        id: str(newTickID.toString()),
        actorID: str(curActorID),
        initiator: jsonToDL(nextInitiator.init),
        resp: jsonToDL(actorResp),
      }),
    });
    newTrace.interp = newInterp;

    switch (actorResp.type) {
      case "continue": {
        // TODO: maybe every ActorResp should have a new state...
        // maybe it can just have (State, Effect[]), like Elm...
        newTrace.latestStates[curActorID] = actorResp.state;
        actorResp.messages.forEach((outgoingMsg) => {
          // record this message
          const newMessageID = newTrace.nextID;
          newTrace.nextID++;
          const [_, newInterp] = newTrace.interp.evalStmt({
            type: "Insert",
            record: rec("message", {
              id: str(newMessageID.toString()),
              toActorID: str(outgoingMsg.to),
              payload: jsonToDL(outgoingMsg.msg),
              fromTickID: str(newTickID.toString()),
            }),
          });
          newTrace.interp = newInterp;
          // insert into queue so we can keep processing this step
          queue.push({
            to: outgoingMsg.to,
            from: curActorID,
            init: {
              type: "messageReceived",
              messageID: newMessageID.toString(),
            },
          });
        });
        break;
      }
      case "exit":
        // don't think we have to do anything...?
        break;
      case "sleep":
        const newTimeoutID = trace.nextID;
        newTrace.nextID++;
        const [_, newInterp] = trace.interp.evalStmt({
          type: "Insert",
          record: rec("timeout", {
            id: str(newTimeoutID.toString()),
            durationMS: int(actorResp.durationMS),
          }),
        });
        newTrace.interp = newInterp;
    }
  }
  return newTrace;
}

export function initialSteps<ActorState extends Json, Msg extends Json>(
  update: UpdateFn<ActorState, Msg>,
  steps: AddressedTickInitiator<ActorState>[]
): Trace<ActorState, Msg> {
  return steps.reduce(
    (st, init) => step(st, update, init),
    initialTrace<ActorState, Msg>()
  );
}

export function sendUserInput<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  newState: ActorState,
  message: { from: string; to: string; payload: Msg }
): Trace<ActorState, Msg> {
  const newTrace = {
    ...trace,
  };

  const newTickID = trace.nextID;
  newTrace.nextID++;
  const [_, newInterp] = trace.interp.evalStmt({
    type: "Insert",
    record: rec("tick", {
      id: str(newTickID.toString()),
      actorID: str(message.from),
      initiator: jsonToDL({ type: "userInput" } as TickInitiator<ActorState>),
      resp: adtToRec({
        type: "continue",
        state: newState,
        messages: [
          {
            to: message.to,
            msg: message.payload,
          },
        ],
      } as ActorResp<ActorState, Msg>),
    }),
  });
  newTrace.interp = newInterp;

  const newMessageID = trace.nextID;
  newTrace.nextID++;
  const [_1, newInterp2] = newTrace.interp.evalStmt({
    type: "Insert",
    record: rec("message", {
      id: str(newMessageID.toString()),
      toActorID: str(message.to),
      payload: jsonToDL(message.payload),
      fromTickID: str(newTickID.toString()),
    }),
  });
  newTrace.interp = newInterp2;

  return step(newTrace, update, {
    to: message.to,
    from: message.from,
    init: {
      type: "messageReceived",
      messageID: newMessageID.toString(),
    },
  });
}

function loadTickInitiator<ActorState, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  init: TickInitiator<ActorState>
): LoadedTickInitiator<ActorState, Msg> {
  switch (init.type) {
    case "messageReceived": {
      const msg = trace.interp.queryStr(
        `message{id: "${init.messageID}", fromTickID: T}`
      ).results[0].term as Rec;
      const fromTick = trace.interp.queryStr(
        `tick{id: "${(msg.attrs.fromTickID as StringLit).val}", actorID: A}`
      ).results[0].term as Rec;
      return {
        type: "messageReceived",
        from: (fromTick.attrs.actorID as StringLit).val,
        payload: dlToJson(msg.attrs.payload) as Msg,
      };
    }
    default:
      return init;
  }
}
