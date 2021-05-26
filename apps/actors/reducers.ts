import { sleep, updateList } from "../../util/util";
import {
  Action,
  State,
  System,
  SystemInstance,
  SystemInstanceAction,
  Trace,
  TraceAction,
  UpdateFn,
} from "./types";
import { Json } from "../../util/json";
import { insertUserInput, pushTickInit, spawnInitiator, step } from "./step";

export function initialState<St, Msg>(
  systems: System<St, Msg>[]
): State<St, Msg> {
  return {
    systemInstances: systems.map((system) => ({
      system,
      trace: system.initialState,
      clientIDs: [],
      nextClientID: 0,
    })),
  };
}

export function reducer<St extends Json, Msg extends Json>(
  state: State<St, Msg>,
  action: Action<St, Msg>
): [State<St, Msg>, Promise<Action<St, Msg>>] {
  switch (action.type) {
    case "UpdateSystemInstance":
      const instance = state.systemInstances.find(
        (inst) => inst.system.id === action.instanceID
      );
      const [newInstance, promise] = systemInstanceReducer(
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
        promise?.then((action) => ({
          type: "UpdateSystemInstance",
          instanceID: instance.system.id,
          action,
        })),
      ];
  }
}

function systemInstanceReducer<St extends Json, Msg extends Json>(
  systemInstance: SystemInstance<St, Msg>,
  action: SystemInstanceAction<St, Msg>
): [SystemInstance<St, Msg>, Promise<SystemInstanceAction<St, Msg>>] {
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
        null,
      ];
    case "UpdateTrace": {
      const [newTrace, promise] = traceReducer(
        systemInstance.trace,
        systemInstance.system.update,
        action.action
      );
      return [
        {
          ...systemInstance,
          trace: newTrace,
        },
        promise?.then((action) => ({ type: "UpdateTrace", action })),
      ];
    }
    case "AllocateClientID":
      return [
        {
          ...systemInstance,
          clientIDs: [...systemInstance.clientIDs, systemInstance.nextClientID],
          nextClientID: systemInstance.nextClientID + 1,
        },
        null,
      ];
  }
}

const NETWORK_LATENCY = 500;

// TODO: returns traces that still need to be stepped...
function traceReducer<St extends Json, Msg extends Json>(
  trace: Trace<St>,
  update: UpdateFn<St, Msg>,
  action: TraceAction<St, Msg>
): [Trace<St>, Promise<TraceAction<St, Msg>> | null] {
  switch (action.type) {
    case "SendUserInput": {
      const { newTrace, newMessageID } = insertUserInput(
        trace,
        update,
        action.clientID,
        action.input
      );
      return [
        pushTickInit(newTrace, {
          from: `user${action.clientID}`,
          to: `client${action.clientID}`,
          init: {
            type: "messageReceived",
            messageID: newMessageID.toString(),
          },
        }),
        Promise.resolve({ type: "Step" }),
      ];
    }
    case "SpawnClient": {
      const trace2 = pushTickInit(
        trace,
        spawnInitiator(`user${action.id}`, action.initialUserState)
      );
      return [
        pushTickInit(
          trace2,
          spawnInitiator(`client${action.id}`, action.initialClientState)
        ),
        Promise.resolve({ type: "Step" }),
      ];
    }
    case "Step": {
      const newTrace = step(trace, update);
      return [
        newTrace,
        newTrace.queue.length === 0
          ? null
          : sleep(NETWORK_LATENCY).then(() => ({
              type: "Step",
            })),
      ];
    }
  }
}
