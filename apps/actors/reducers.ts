import { updateList } from "../../util/util";
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
import { insertUserInput, pushTickInit, spawnInitiator } from "./step";

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

// TODO: returns traces that still need to be stepped...
function traceReducer<St extends Json, Msg extends Json>(
  trace: Trace<St>,
  update: UpdateFn<St, Msg>,
  action: TraceAction<St, Msg>
): Trace<St> {
  switch (action.type) {
    case "SendUserInput": {
      const { newTrace, newMessageID } = insertUserInput(
        trace,
        update,
        action.clientID,
        action.input
      );
      return pushTickInit(newTrace, {
        from: `user${action.clientID}`,
        to: `client${action.clientID}`,
        init: {
          type: "messageReceived",
          messageID: newMessageID.toString(),
        },
      });
    }
    case "SpawnClient": {
      const trace2 = pushTickInit(
        trace,
        spawnInitiator(`user${action.id}`, action.initialUserState)
      );
      return pushTickInit(
        trace2,
        spawnInitiator(`client${action.id}`, action.initialClientState)
      );
    }
  }
}
