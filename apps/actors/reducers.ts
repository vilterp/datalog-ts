import { updateList } from "../../util/util";
import {
  Action,
  System,
  State,
  SystemInstance,
  SystemInstanceAction,
} from "./types";
import { Json } from "../../util/json";

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
      return { ...systemInstance, trace: action.newTrace };
    case "AllocateClientID":
      return {
        ...systemInstance,
        clientIDs: [...systemInstance.clientIDs, systemInstance.nextClientID],
        nextClientID: systemInstance.nextClientID + 1,
      };
  }
}
