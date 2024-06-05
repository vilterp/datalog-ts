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
import { stepTrace } from "./step";
// @ts-ignore
import patternsDL from "./patterns.dl";
import { makeMemoryLoader } from "../../core/loaders";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { DEFAULT_STEP_LIMIT, explore } from "./explore";

export const INITIAL_NETWORK_LATENCY_MS = 1000;

export function initialState<St, Msg>(
  systems: System<St, Msg>[]
): State<St, Msg> {
  return {
    networkLatency: INITIAL_NETWORK_LATENCY_MS,
    systemInstances: systems.map((system) => {
      const interp = new IncrementalInterpreter(
        ".",
        makeMemoryLoader({
          "patterns.dl": patternsDL,
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

export function reducer(
  state: State<Json, Json>,
  action: Action<Json, Json>
): [State<Json, Json>, Promise<Action<Json, Json>>[]] {
  switch (action.type) {
    case "UpdateSystemInstance":
      const instance = state.systemInstances.find(
        (inst) => inst.system.id === action.instanceID
      );
      const [newInstance, promises] = systemInstanceReducer(
        state.networkLatency,
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
    case "ChangeNetworkLatency":
      return [
        {
          ...state,
          networkLatency: action.newLatency,
        },
        [],
      ];
  }
}

function systemInstanceReducer<St extends Json, Msg extends Json>(
  networkLatency: number,
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
        networkLatency,
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
    case "Explore": {
      const randomSeed = new Date().getTime();
      const frame = explore(systemInstance, DEFAULT_STEP_LIMIT, randomSeed);
      return [frame.state, []];
    }
  }
}

// TODO: returns traces that still need to be stepped...
function traceReducer<St extends Json, Msg extends Json>(
  networkLatency: number,
  trace: Trace<St>,
  update: UpdateFn<St, Msg>,
  action: TraceAction<St, Msg>
): [Trace<St>, Promise<TraceAction<St, Msg>>[]] {
  const [newTrace, newInits] = stepTrace(trace, update, action);
  return [newTrace, promisesWithLatency(networkLatency, newInits)];
}

function promisesWithLatency<St, Msg>(
  networkLatency: number,
  inits: AddressedTickInitiator<St>[]
): Promise<TraceAction<St, Msg>>[] {
  return inits.map((init) => {
    const hopLatency = latency(networkLatency, init);
    // console.log("latency for", init, ":", hopLatency);
    return sleep(hopLatency).then(() => ({ type: "Step", init }));
  });
}

// TODO: base on actor types, not substrings
function latency<St>(
  networkLatency: number,
  init: AddressedTickInitiator<St>
): number {
  if (init.from.startsWith("user") && init.to.startsWith("client")) {
    return 0;
  }
  if (init.init.type === "spawned") {
    return 0;
  }
  return networkLatency;
}
