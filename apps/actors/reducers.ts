import { sleep, updateList } from "../../util/util";
import {
  Action,
  AddressedTickInitiator,
  State,
  System,
  SystemInstance,
  SystemInstanceAction,
  Trace,
  TraceAction,
  UpdateFn,
} from "./types";
import { Json } from "../../util/json";
import { insertUserInput, spawnInitiator, step } from "./step";
// @ts-ignore
import patternsDL from "./patterns.dl";
import { makeMemoryLoader } from "../../core/loaders";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";

export function initialState<St, Msg>(
  systems: System<St, Msg>[]
): State<St, Msg> {
  return {
    systemInstances: systems.map((system) => {
      const interp = new IncrementalInterpreter(
        ".",
        makeMemoryLoader({
          "./patterns.dl": patternsDL,
        })
      );
      return {
        system,
        trace: system.getInitialState(interp),
        clientIDs: [],
        nextClientID: 0,
      };
    }),
  };
}

export function reducer<St extends Json, Msg extends Json>(
  state: State<St, Msg>,
  action: Action<St, Msg>
): [State<St, Msg>, Promise<Action<St, Msg>>[]] {
  switch (action.type) {
    case "UpdateSystemInstance":
      const instance = state.systemInstances.find(
        (inst) => inst.system.id === action.instanceID
      );
      const [newInstance, promises] = systemInstanceReducer(
        instance,
        action.action
      );
      return [
        {
          ...state,
          systemInstances: updateList(
            state.systemInstances,
            (systemInstance) => systemInstance.system.id === action.instanceID,
            (old) => newInstance
          ),
        },
        promises.map((p) =>
          p.then((action) => ({
            type: "UpdateSystemInstance",
            instanceID: instance.system.id,
            action,
          }))
        ),
      ];
  }
}

function systemInstanceReducer<St extends Json, Msg extends Json>(
  systemInstance: SystemInstance<St, Msg>,
  action: SystemInstanceAction<St, Msg>
): [SystemInstance<St, Msg>, Promise<SystemInstanceAction<St, Msg>>[]] {
  switch (action.type) {
    case "ExitClient":
      // TODO: mark it as exited in the trace
      return [
        {
          ...systemInstance,
          clientIDs: systemInstance.clientIDs.filter(
            (id) => id !== action.clientID
          ),
        },
        [],
      ];
    case "UpdateTrace": {
      const [newTrace, promises] = traceReducer(
        systemInstance.trace,
        systemInstance.system.update,
        action.action
      );
      return [
        {
          ...systemInstance,
          trace: newTrace,
        },
        promises.map((p) =>
          p.then((action) => ({ type: "UpdateTrace", action }))
        ),
      ];
    }
    case "AllocateClientID":
      return [
        {
          ...systemInstance,
          clientIDs: [
            ...systemInstance.clientIDs,
            systemInstance.nextClientID.toString(),
          ],
          nextClientID: systemInstance.nextClientID + 1,
        },
        [],
      ];
  }
}

// TODO: returns traces that still need to be stepped...
function traceReducer<St extends Json, Msg extends Json>(
  trace: Trace<St>,
  update: UpdateFn<St, Msg>,
  action: TraceAction<St, Msg>
): [Trace<St>, Promise<TraceAction<St, Msg>>[]] {
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
      return [trace3, promisesWithLatency(newInits)];
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
      return [trace3, promisesWithLatency([...newInits1, ...newInits2])];
    }
    case "Step": {
      const { newTrace, newInits } = step(trace, update, action.init);
      return [newTrace, promisesWithLatency(newInits)];
    }
  }
}

const NETWORK_LATENCY = 1000;

function promisesWithLatency<St, Msg>(
  inits: AddressedTickInitiator<St>[]
): Promise<TraceAction<St, Msg>>[] {
  return inits.map((init) => {
    const hopLatency = latency(init);
    // console.log("latency for", init, ":", hopLatency);
    return sleep(hopLatency).then(() => ({ type: "Step", init }));
  });
}

// TODO: base on actor types, not substrings
function latency<St>(init: AddressedTickInitiator<St>): number {
  if (init.from.startsWith("user") && init.to.startsWith("client")) {
    return 0;
  }
  if (init.init.type === "spawned") {
    return 0;
  }
  return NETWORK_LATENCY;
}
