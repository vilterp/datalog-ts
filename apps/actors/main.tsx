import * as React from "react";
import { useReducer } from "react";
import * as ReactDOM from "react-dom";
import { Explorer } from "../../uiCommon/explorer";
import ReactJson from "react-json-view";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";
import {
  initialState,
  reducer,
  ScenarioAction,
  SystemInstance,
} from "./reducers";
import { SCENARIOS } from "./scenarios";
import { sendUserInputAsync, spawnAsync } from "./step";
import useHashParam from "use-hash-param";

function Main() {
  const [state, dispatch] = useReducer(reducer, initialState(SCENARIOS));
  const [selectedScenarioID, setSelectedScenarioID] = useHashParam(
    "scenario",
    SCENARIOS[0].id
  );

  return (
    <>
      <h1>Communicating Processes Viz</h1>

      <Tabs
        setTabID={setSelectedScenarioID}
        curTabID={selectedScenarioID}
        tabs={state.systemInstances.map((systemInstance) => ({
          name: systemInstance.scenario.name,
          id: systemInstance.scenario.id,
          render: () => {
            return (
              <Scenario
                systemInstance={systemInstance}
                dispatch={(action) =>
                  dispatch({
                    type: "UpdateScenario",
                    scenarioID: systemInstance.scenario.id,
                    action,
                  })
                }
              />
            );
          },
        }))}
      />
    </>
  );
}

function Scenario<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  dispatch: (action: ScenarioAction<St, Msg>) => void;
}) {
  return (
    <>
      <MultiClient
        systemInstance={props.systemInstance}
        dispatch={props.dispatch}
      />

      <Explorer interp={props.systemInstance.trace.interp} showViz={true} />

      <h2>State</h2>
      <ReactJson src={props.systemInstance.trace.latestStates} />
    </>
  );
}

function MultiClient<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  dispatch: (action: ScenarioAction<St, Msg>) => void;
}) {
  const sendInput = (clientID: number, input: Msg) => {
    sendUserInputAsync(
      props.systemInstance.trace,
      props.systemInstance.scenario.update,
      clientID,
      input,
      (newTrace) => props.dispatch({ type: "UpdateTrace", newTrace })
    );
  };

  return (
    <>
      <ul>
        {props.systemInstance.clientIDs.map((clientID) => {
          const clientState =
            props.systemInstance.trace.latestStates[`client${clientID}`];

          return (
            <li key={clientID}>
              <button
                onClick={() => {
                  props.dispatch({ type: "ExitClient", clientID });
                }}
              >
                x
              </button>
              {clientState ? (
                <props.systemInstance.scenario.ui
                  state={clientState}
                  sendUserInput={(input) => sendInput(clientID, input)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => {
          props.dispatch({ type: "AllocateClientID" });
          spawnAsync(
            props.systemInstance.trace,
            props.systemInstance.scenario,
            props.systemInstance.nextClientID,
            (newTrace) => props.dispatch({ type: "UpdateTrace", newTrace })
          );
        }}
      >
        Add Client
      </button>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
