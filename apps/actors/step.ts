import { Json } from "../../util/json";
import { int, Rec, rec, str, StringLit } from "../../core/types";
import { adtToRec, dlToJson, jsonToDL } from "../../util/json2dl";
import {
  ActorResp,
  AddressedTickInitiator,
  initialTrace,
  LoadedTickInitiator,
  TickInitiator,
  Trace,
  UpdateFn,
} from "./types";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

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
        spawningTickID: str(nextInitiator.init.spawningTickID),
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
      spawningTickID: "0",
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
      id: str(newTickID.toString()),
      actorID: str(from),
      initiator: jsonToDL({ type: "userInput" } as TickInitiator<ActorState>),
      resp: adtToRec({
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
      fromTickID: str(newTickID.toString()),
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
