import { sleep, updateList } from "../../util/util";
import {
  Action,
  AddressedTickInitiator,
  State,
  System,
  SystemInstance,
  SystemInstanceAction,
  SystemState,
  TimeTravelAction,
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
import { explore } from "./explore";

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
        currentStateIdx: 0,
        stateHistory: [
          {
            trace: system.getInitialState(interp),
            clientIDs: [],
            nextClientID: 0,
          },
        ],
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
            action: { type: "Advance", action },
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

// Time travel reducer?
function systemInstanceReducer<St extends Json, Msg extends Json>(
  networkLatency: number,
  systemInstance: SystemInstance<St, Msg>,
  action: TimeTravelAction<St, Msg>
): [SystemInstance<St, Msg>, Promise<SystemInstanceAction<St, Msg>>[]] {
  const latestState =
    systemInstance.stateHistory[systemInstance.currentStateIdx];

  switch (action.type) {
    case "TimeTravelTo":
      return [
        {
          ...systemInstance,
          currentStateIdx: action.idx,
        },
        [],
      ];
    case "Advance": {
      const atEnd =
        systemInstance.stateHistory.length === 0 ||
        systemInstance.currentStateIdx ===
          systemInstance.stateHistory.length - 1;
      if (!atEnd) {
        // TODO: surface this to the user somehow
        console.warn("action ignored because we haven't branched", action);
        return [systemInstance, []];
      }

      const [newState, promises] = systemStateReducer(
        networkLatency,
        systemInstance.system,
        latestState,
        action.action
      );
      return [
        {
          ...systemInstance,
          currentStateIdx: systemInstance.currentStateIdx + 1,
          stateHistory: [...systemInstance.stateHistory, newState],
        },
        promises,
      ];
    }
    case "Branch":
      return [
        {
          ...systemInstance,
          stateHistory: systemInstance.stateHistory.slice(
            0,
            systemInstance.currentStateIdx + 1
          ),
        },
        [],
      ];
    case "Explore": {
      // Explore
      const randomSeed = new Date().getTime();
      const frame = explore(
        systemInstance.system,
        latestState,
        action.steps,
        randomSeed
      );

      // Extract history
      const exploreHistory = [];
      let curFrame = frame;
      while (curFrame.parent) {
        exploreHistory.push(curFrame.state);
        curFrame = curFrame.parent;
      }

      // Join histories
      const newStateHistory = [
        ...systemInstance.stateHistory,
        ...exploreHistory.reverse(),
      ];

      return [
        {
          ...systemInstance,
          currentStateIdx: newStateHistory.length - 1,
          stateHistory: newStateHistory,
        },
        [],
      ];
    }
  }
}

function systemStateReducer<St extends Json, Msg extends Json>(
  networkLatency: number,
  system: System<St, Msg>,
  latestState: SystemState<St>,
  action: SystemInstanceAction<St, Msg>
): [SystemState<St>, Promise<SystemInstanceAction<St, Msg>>[]] {
  switch (action.type) {
    case "ExitClient":
      // TODO: mark it as exited in the trace
      return [
        {
          ...latestState,
          clientIDs: latestState.clientIDs.filter(
            (id) => id !== action.clientID
          ),
        },
        [],
      ];
    case "UpdateTrace": {
      const [newTrace, promises] = traceReducer(
        networkLatency,
        latestState.trace,
        system.update,
        action.action
      );
      return [
        {
          ...latestState,
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
          ...latestState,
          clientIDs: [
            ...latestState.clientIDs,
            latestState.nextClientID.toString(),
          ],
          nextClientID: latestState.nextClientID + 1,
        },
        [],
      ];
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
