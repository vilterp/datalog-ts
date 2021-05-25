import { updateList } from "../../util/util";
import { Action, System, State, Trace } from "./types";
import { Json } from "../../util/json";

export function initialState<St, Msg>(
  scenarios: System<St, Msg>[]
): State<St, Msg> {
  return {
    systemInstances: scenarios.map((scenario) => ({
      scenario,
      trace: scenario.initialState,
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
    case "UpdateScenario":
      return {
        ...state,
        systemInstances: updateList(
          state.systemInstances,
          (systemInstance) => systemInstance.scenario.id === action.scenarioID,
          (old) => scenarioReducer(old, action.action)
        ),
      };
  }
}

export type SystemInstance<ActorState, Msg> = {
  scenario: System<ActorState, Msg>;
  trace: Trace<ActorState>;
  clientIDs: number[];
  nextClientID: number;
};

export type ScenarioAction<St, Msg> =
  | {
      type: "UpdateTrace";
      newTrace: Trace<St>;
    }
  | { type: "AllocateClientID" }
  | { type: "ExitClient"; clientID: number };

function scenarioReducer<St extends Json, Msg extends Json>(
  systemInstance: SystemInstance<St, Msg>,
  action: ScenarioAction<St, Msg>
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
