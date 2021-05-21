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
import { mapObjToList } from "../../util/util";

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
      newTrace.interp = newTrace.interp.insert(
        rec("actor", {
          id: str(nextInitiator.to),
          spawningTickID: str(nextInitiator.init.spawningTickID),
          initialState: jsonToDL(spawn.initialState),
        })
      );
    }

    const curActorID = nextInitiator.to;
    const actorState =
      init.init.type === "spawned"
        ? init.init.initialState
        : newTrace.latestStates[curActorID];
    const actorResp = update(
      actorState,
      loadTickInitiator(newTrace, nextInitiator.init)
    );

    const newTickID = newTrace.nextID;
    newTrace.nextID++;
    newTrace.interp = newTrace.interp.insert(
      rec("tick", {
        id: str(newTickID.toString()),
        actorID: str(curActorID),
        initiator: jsonToDL(nextInitiator.init),
        resp: jsonToDL(actorResp),
      })
    );

    switch (actorResp.type) {
      case "continue": {
        // TODO: maybe every ActorResp should have a new state...
        // maybe it can just have (State, Effect[]), like Elm...
        newTrace.latestStates[curActorID] = actorResp.state;
        actorResp.messages.forEach((outgoingMsg) => {
          // record this message
          const newMessageID = newTrace.nextID;
          newTrace.nextID++;
          newTrace.interp = newTrace.interp.insert(
            rec("message", {
              id: str(newMessageID.toString()),
              toActorID: str(outgoingMsg.to),
              payload: jsonToDL(outgoingMsg.msg),
              fromTickID: str(newTickID.toString()),
            })
          );
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
        newTrace.interp = trace.interp.insert(
          rec("timeout", {
            id: str(newTimeoutID.toString()),
            durationMS: int(actorResp.durationMS),
          })
        );
    }
  }
  return newTrace;
}

export function spawnInitialActors<ActorState extends Json, Msg extends Json>(
  update: UpdateFn<ActorState, Msg>,
  initialStates: { [actorID: string]: ActorState }
): Trace<ActorState, Msg> {
  return Object.entries(initialStates).reduce(
    (trace, [actorID, actorState]) => spawn(trace, update, actorID, actorState),
    initialTrace<ActorState, Msg>()
  );
}

export function spawn<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  id: string,
  initialState: ActorState
): Trace<ActorState, Msg> {
  return step(trace, update, {
    to: id,
    from: "<god>", // lol
    init: {
      type: "spawned",
      spawningTickID: "0",
      initialState,
    },
  });
}

// creates a tick on the user
// TODO: multiple user actors!
export function sendUserInput<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  clientID: number,
  payload: Msg
): Trace<ActorState, Msg> {
  const newTrace = {
    ...trace,
  };

  const from = `user${clientID}`;
  const to = `client${clientID}`;

  const newTickID = trace.nextID;
  newTrace.nextID++;
  newTrace.interp = trace.interp.insert(
    rec("tick", {
      id: str(newTickID.toString()),
      actorID: str(from),
      initiator: jsonToDL({ type: "userInput" } as TickInitiator<ActorState>),
      resp: adtToRec({
        type: "continue",
        state: trace.latestStates[from],
        messages: [
          {
            to: to,
            msg: payload,
          },
        ],
      } as ActorResp<ActorState, Msg>),
    })
  );

  const newMessageID = trace.nextID;
  newTrace.nextID++;
  newTrace.interp = newTrace.interp.insert(
    rec("message", {
      id: str(newMessageID.toString()),
      toActorID: str(to),
      payload: jsonToDL(payload),
      fromTickID: str(newTickID.toString()),
    })
  );

  return step(newTrace, update, {
    to,
    from,
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
      )[0].term as Rec;
      const fromTick = trace.interp.queryStr(
        `tick{id: "${(msg.attrs.fromTickID as StringLit).val}", actorID: A}`
      )[0].term as Rec;
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
