import { updateList } from "../../util/util";
import {
  Action,
  System,
  State,
  SystemInstance,
  SystemInstanceAction,
  TraceAction,
  Trace,
  UpdateFn,
} from "./types";
import { Json } from "../../util/json";
import { pushTickInit, step } from "./step";

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
): State<St, Msg> {
  switch (action.type) {
    case "UpdateSystemInstance":
      return {
        ...state,
        systemInstances: updateList(
          state.systemInstances,
          (systemInstance) => systemInstance.system.id === action.instanceID,
          (old) => systemInstanceReducer(old, action.action)
        ),
      };
  }
}

function systemInstanceReducer<St extends Json, Msg extends Json>(
  systemInstance: SystemInstance<St, Msg>,
  action: SystemInstanceAction<St, Msg>
): SystemInstance<St, Msg> {
  switch (action.type) {
    case "ExitClient":
      // TODO: mark it as exited in the trace
      return {
        ...systemInstance,
        clientIDs: systemInstance.clientIDs.filter(
          (id) => id !== action.clientID
        ),
      };
    case "UpdateTrace":
      return {
        ...systemInstance,
        trace: traceReducer(
          systemInstance.trace,
          systemInstance.system.update,
          action.action
        ),
      };
    case "AllocateClientID":
      return {
        ...systemInstance,
        clientIDs: [...systemInstance.clientIDs, systemInstance.nextClientID],
        nextClientID: systemInstance.nextClientID + 1,
      };
  }
}

function traceReducer<St extends Json, Msg extends Json>(
  trace: Trace<St>,
  update: UpdateFn<St, Msg>,
  action: TraceAction<St>
): Trace<St> {
  switch (action.type) {
    case "SendInitiator":
      return step(pushTickInit(trace, action.init), update);
    case "InsertRecord": {
      return {
        ...trace,
        nextID: trace.nextID + 1,
        interp: trace.interp.insert(action.rec),
      };
    }
  }
}
