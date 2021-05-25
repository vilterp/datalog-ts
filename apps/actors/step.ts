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
import { sleep } from "../../util/util";

export function stepAll<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  inQueue: AddressedTickInitiator<ActorState>[]
): Trace<ActorState, Msg> {
  const queue = [...inQueue];
  let curTrace = trace;
  while (queue.length > 0) {
    const nextInit = queue.shift();
    const { newTrace, newMessages } = step(curTrace, update, nextInit);
    curTrace = newTrace;
    newMessages.forEach((msg) => {
      queue.push(msg);
    });
  }
  return curTrace;
}

const NETWORK_LATENCY = 500;

export async function stepAllAsync<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  queue: AddressedTickInitiator<ActorState>[],
  setTrace: (trace: Trace<ActorState, Msg>) => void
): Promise<Trace<ActorState, Msg>> {
  if (queue.length === 0) {
    return trace;
  }

  const { newMessages, newTrace } = step(trace, update, queue[0]);
  setTrace(newTrace);

  const newQueue = [...queue.slice(1), ...newMessages];
  if (newQueue.length === 0) {
    return newTrace;
  }

  await sleep(NETWORK_LATENCY);
  return await stepAllAsync(newTrace, update, newQueue, setTrace);
}

function step<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  nextInitiator: AddressedTickInitiator<ActorState>
): {
  newTrace: Trace<ActorState, Msg>;
  newMessages: AddressedTickInitiator<ActorState>[];
} {
  const newTrace: Trace<ActorState, Msg> = {
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

  return { newTrace, newMessages };
}

export function spawnInitialActors<ActorState extends Json, Msg extends Json>(
  update: UpdateFn<ActorState, Msg>,
  initialStates: { [actorID: string]: ActorState }
): Trace<ActorState, Msg> {
  return Object.entries(initialStates).reduce(
    (trace, [actorID, actorState]) =>
      spawnSync(trace, update, actorID, actorState),
    initialTrace<ActorState, Msg>()
  );
}

export function spawn<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  id: string,
  initialState: ActorState
): {
  newTrace: Trace<ActorState, Msg>;
  newMessages: AddressedTickInitiator<ActorState>[];
} {
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

// TODO: DRY up with Spawn
export function spawnSync<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  id: string,
  initialState: ActorState
): Trace<ActorState, Msg> {
  return stepAll(trace, update, [
    {
      to: id,
      from: "<god>", // lol
      init: {
        type: "spawned",
        spawningTickID: "0",
        initialState,
      },
    },
  ]);
}

export function insertUserInput<ActorState extends Json, Msg extends Json>(
  trace: Trace<ActorState, Msg>,
  update: UpdateFn<ActorState, Msg>,
  clientID: number,
  payload: Msg
): { newTrace: Trace<ActorState, Msg>; newMessageID: number } {
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

  return { newTrace, newMessageID };
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
