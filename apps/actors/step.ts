import { Json } from "../../util/json";
import { int, Rec, rec, str, StringLit } from "../../core/types";
import { dlToJson, jsonToDL } from "../../util/json2dl";
import {
  ActorResp,
  AddressedTickInitiator,
  initialTrace,
  LoadedTickInitiator,
  TickInitiator,
  Trace,
  TraceAction,
  UpdateFn,
} from "./types";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { ppt } from "../../core/pretty";

export function stepAll<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState>,
  update: UpdateFn<ActorState, Msg>,
  inits: AddressedTickInitiator<ActorState>[]
): Trace<ActorState> {
  const queue: AddressedTickInitiator<ActorState>[] = [...inits];
  let curTrace = trace;
  while (queue.length > 0) {
    const init = queue.shift();
    const { newTrace, newInits } = step(curTrace, update, init);
    curTrace = newTrace;
    newInits.forEach((init) => queue.push(init));
  }
  return curTrace;
}

export function stepTrace<St extends Json, Msg extends Json>(
  trace: Trace<St>,
  update: UpdateFn<St, Msg>,
  action: TraceAction<St, Msg>
): [Trace<St>, AddressedTickInitiator<St>[]] {
  switch (action.type) {
    case "SendUserInput": {
      const { newTrace: trace2, newMessageID } = insertUserInput(
        trace,
        action.clientID,
        action.input
      );
      const { newTrace: trace3, newInits } = step(trace2, update, {
        from: `user${action.clientID}`,
        to: `client${action.clientID}`,
        init: {
          type: "messageReceived",
          messageID: newMessageID.toString(),
        },
      });
      // console.log("traceReducer", "dispatchInits", newInits);
      return [trace3, newInits];
    }
    case "SpawnClient": {
      const { newTrace: trace2, newInits: newInits1 } = step(
        trace,
        update,
        spawnInitiator(`user${action.id}`, action.initialUserState)
      );
      const { newTrace: trace3, newInits: newInits2 } = step(
        trace2,
        update,
        spawnInitiator(`client${action.id}`, action.initialClientState)
      );
      return [trace3, [...newInits1, ...newInits2]];
    }
    case "Step": {
      const { newTrace, newInits } = step(trace, update, action.init);
      return [newTrace, newInits];
    }
  }
}

export function step<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState>,
  update: UpdateFn<ActorState, Msg>,
  nextInitiator: AddressedTickInitiator<ActorState>
): {
  newTrace: Trace<ActorState>;
  newInits: AddressedTickInitiator<ActorState>[];
} {
  const newTrace: Trace<ActorState> = {
    nextID: trace.nextID,
    interp: trace.interp,
    latestStates: {
      ...trace.latestStates,
    },
  };
  const newMessages: AddressedTickInitiator<ActorState>[] = [];

  if (nextInitiator.init.type === "spawned") {
    const spawn = nextInitiator.init;
    newTrace.latestStates[nextInitiator.to] = spawn.initialState;
    newTrace.interp = newTrace.interp.insert(
      rec("actor", {
        id: str(nextInitiator.to),
        spawningTickID: int(nextInitiator.init.spawningTickID),
        initialState: jsonToDL(spawn.initialState),
      })
    );
  }

  const curActorID = nextInitiator.to;
  const actorState = newTrace.latestStates[curActorID];
  const actorResp = update(
    actorState,
    loadTickInitiator(newTrace, nextInitiator.init)
  );

  const newTickID = newTrace.nextID;
  newTrace.nextID++;
  newTrace.interp = newTrace.interp.insert(
    rec("tick", {
      id: int(newTickID),
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
            fromTickID: int(newTickID),
          })
        );
        // insert into queue so we can keep processing this step
        newMessages.push({
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

  return { newTrace, newInits: newMessages };
}

export function spawnInitialActors<ActorState extends Json, Msg extends Json>(
  update: UpdateFn<ActorState, Msg>,
  interp: AbstractInterpreter,
  initialStates: { [actorID: string]: ActorState }
): Trace<ActorState> {
  return Object.entries(initialStates).reduce(
    (trace, [actorID, actorState]) =>
      spawnSync(trace, update, actorID, actorState),
    initialTrace<ActorState>(interp)
  );
}

export function spawnSync<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState>,
  update: UpdateFn<ActorState, Msg>,
  id: string,
  initialState: ActorState
): Trace<ActorState> {
  return stepAll(trace, update, [spawnInitiator(id, initialState)]);
}

export function spawnInitiator<St>(
  id: string,
  initialState: St
): AddressedTickInitiator<St> {
  return {
    to: id,
    from: "<god>", // lol
    init: {
      type: "spawned",
      spawningTickID: 0,
      initialState,
    },
  };
}

export function insertUserInput<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState>,
  clientID: string,
  payload: Msg
): { newTrace: Trace<ActorState>; newMessageID: number } {
  const newTrace = {
    ...trace,
  };

  const from = `user${clientID}`;
  const to = `client${clientID}`;

  const newTickID = trace.nextID;
  newTrace.nextID++;
  const latestState = trace.latestStates[from];
  newTrace.interp = trace.interp.insert(
    rec("tick", {
      id: int(newTickID),
      actorID: str(from),
      initiator: jsonToDL({ type: "userInput" } as TickInitiator<ActorState>),
      resp: jsonToDL({
        type: "continue",
        state: latestState,
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
      fromTickID: int(newTickID),
    })
  );

  return { newTrace, newMessageID };
}

function loadTickInitiator<ActorState, Msg extends Json>(
  trace: Trace<ActorState>,
  init: TickInitiator<ActorState>
): LoadedTickInitiator<ActorState, Msg> {
  switch (init.type) {
    case "messageReceived": {
      const msg = trace.interp.queryStr(
        `message{id: "${init.messageID}", fromTickID: T}?`
      )[0].term as Rec;
      const fromTick = trace.interp.queryStr(
        `tick{id: ${ppt(msg.attrs.fromTickID)}, actorID: A}?`
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
