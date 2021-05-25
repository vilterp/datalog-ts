import * as React from "react";
import { useReducer } from "react";
import * as ReactDOM from "react-dom";
import { Explorer } from "../../uiCommon/explorer";
import ReactJson from "react-json-view";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";
import { initialState, reducer, ScenarioAction, ScenState } from "./reducers";
import { SCENARIOS } from "./scenarios";
import { sendUserInputAsync, spawnAsync } from "./step";

function Main() {
  const [state, dispatch] = useReducer(reducer, initialState(SCENARIOS));

  return (
    <>
      <h1>Communicating Processes Viz</h1>

      <Tabs
        setTabID={(scenarioID) =>
          dispatch({ type: "SelectScenario", scenarioID })
        }
        curTabID={state.selectedScenarioID}
        tabs={state.scenStates.map((scenState) => ({
          name: scenState.scenario.name,
          id: scenState.scenario.id,
          render: () => {
            return (
              <Scenario
                scenState={scenState}
                dispatch={(action) =>
                  dispatch({
                    type: "UpdateScenario",
                    scenarioID: scenState.scenario.id,
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
  scenState: ScenState<St, Msg>;
  dispatch: (action: ScenarioAction<St, Msg>) => void;
}) {
  return (
    <>
      <MultiClient scenState={props.scenState} dispatch={props.dispatch} />

      <Explorer interp={props.scenState.trace.interp} showViz={true} />

      <h2>State</h2>
      <ReactJson src={props.scenState.trace.latestStates} />
    </>
  );
}

function MultiClient<St extends Json, Msg extends Json>(props: {
  scenState: ScenState<St, Msg>;
  dispatch: (action: ScenarioAction<St, Msg>) => void;
}) {
  const sendInput = (clientID: number, input: Msg) => {
    sendUserInputAsync(
      props.scenState.trace,
      props.scenState.scenario.update,
      clientID,
      input,
      (newTrace) => props.dispatch({ type: "UpdateTrace", newTrace })
    );
  };

  return (
    <>
      <ul>
        {props.scenState.clientIDs.map((clientID) => {
          const clientState =
            props.scenState.trace.latestStates[`client${clientID}`];

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
                <props.scenState.scenario.ui
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
            props.scenState.trace,
            props.scenState.scenario,
            props.scenState.nextClientID,
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
