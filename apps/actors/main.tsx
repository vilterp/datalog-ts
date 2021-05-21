import * as React from "react";
import { useState } from "react";
import * as ReactDOM from "react-dom";
import { scenario as simpleCounter } from "./scenarios/simpleCounter";
import { scenario as todoMVC } from "./scenarios/todoMVC";
import useHashParam from "use-hash-param";
import { Explorer } from "../../uiCommon/explorer";
import { Scenario, Trace } from "./types";
import ReactJson from "react-json-view";
import { sendUserInput, spawn } from "./step";
import { updateList } from "../../util/util";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";

type ScenarioAndState<St, Msg> = {
  scenario: Scenario<St, Msg>;
  trace: Trace<St, Msg>;
};

const initialScenarioAndStates: ScenarioAndState<any, any>[] = [
  todoMVC,
  simpleCounter,
].map((scenario) => ({ scenario, trace: scenario.initialState }));

function Main() {
  const [scenarioAndStates, setScenarioAndStates] = useState<
    ScenarioAndState<any, any>[]
  >(initialScenarioAndStates);

  const [curTabID, setTabID] = useHashParam(
    "scenario",
    scenarioAndStates[0].scenario.id
  );

  return (
    <>
      <h1>Communicating Processes Viz</h1>

      <Tabs
        setTabID={setTabID}
        curTabID={curTabID}
        tabs={scenarioAndStates.map((scenarioAndState) => ({
          name: scenarioAndState.scenario.name,
          id: scenarioAndState.scenario.id,
          render: () => {
            const trace = scenarioAndState.trace;
            const scenario = scenarioAndState.scenario;

            const setTrace = <St, Msg>(newTrace: Trace<St, Msg>) => {
              setScenarioAndStates(
                updateList(
                  scenarioAndStates,
                  (ss) => ss.scenario.name === scenario.name,
                  (ss) => ({ ...ss, trace: newTrace })
                )
              );
            };

            return (
              <>
                <MultiClient
                  trace={trace}
                  setTrace={setTrace}
                  scenario={scenario}
                />

                <Explorer interp={trace.interp} showViz={true} />

                <h2>State</h2>
                <ReactJson src={trace.latestStates} />
              </>
            );
          },
        }))}
      />
    </>
  );
}

function MultiClient<St extends Json, Msg extends Json>(props: {
  trace: Trace<St, Msg>;
  setTrace: (t: Trace<St, Msg>) => void;
  scenario: Scenario<St, Msg>;
}) {
  const [nextClientID, setNextClientID] = useState(0);
  const [clientIDs, setClientIDs] = useState<number[]>([]);

  return (
    <>
      <ul>
        {clientIDs.map((clientID) => {
          return (
            <li key={clientID}>
              <button
                onClick={() => {
                  setClientIDs(clientIDs.filter((id) => id !== clientID));
                }}
              >
                x
              </button>
              <props.scenario.ui
                state={props.trace.latestStates[`client${clientID}`]}
                sendUserInput={(input) =>
                  props.setTrace(
                    sendUserInput(
                      props.trace,
                      props.scenario.update,
                      clientID,
                      input
                    )
                  )
                }
              />
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => {
          setNextClientID(nextClientID + 1);
          setClientIDs([...clientIDs, nextClientID]);
          // TODO: spawn a new user?
          const trace1 = spawn(
            props.trace,
            props.scenario.update,
            `client${nextClientID}`,
            props.scenario.initialClientState
          );
          const trace2 = spawn(
            trace1,
            props.scenario.update,
            `user${nextClientID}`,
            props.scenario.initialUserState
          );
          props.setTrace(trace2);
        }}
      >
        Add Client
      </button>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
