import * as React from "react";
import { useState } from "react";
import * as ReactDOM from "react-dom";
import { scenario as simpleCounter } from "./scenarios/simpleCounter";
import { scenario as todoMVC } from "./scenarios/todoMVC";
import useHashParam from "use-hash-param";
import { Explorer } from "../../uiCommon/explorer";
import { Scenario, Trace } from "./types";
import ReactJson from "react-json-view";
import * as Step from "./step";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";
import { insertUserInput, stepAllAsync } from "./step";
import { updateList } from "../../util/util";

const SCENARIOS: Scenario<any, any>[] = [todoMVC, simpleCounter];

function Main() {
  const {
    trace,
    sendInput,
    spawn,
    selectedScenarioID,
    setSelectedScenarioID,
  } = useScenarios(SCENARIOS);

  return (
    <>
      <h1>Communicating Processes Viz</h1>

      <Tabs
        setTabID={setSelectedScenarioID}
        curTabID={selectedScenarioID}
        tabs={SCENARIOS.map((scenario) => ({
          name: scenario.name,
          id: scenario.id,
          render: () => {
            return (
              <Animated
                scenario={scenario}
                spawn={spawn}
                sendInput={sendInput}
                trace={trace}
              />
            );
          },
        }))}
      />
    </>
  );
}

function Animated<ActorState extends Json, Msg extends Json>(props: {
  scenario: Scenario<ActorState, Msg>;
  trace: Trace<ActorState, Msg>;
  sendInput: (fromUserID: number, input: Msg) => void;
  spawn: (id: number) => void;
}) {
  return (
    <>
      <MultiClient
        trace={props.trace}
        sendInput={props.sendInput}
        spawn={props.spawn}
        scenario={props.scenario}
      />

      <Explorer interp={props.trace.interp} showViz={true} />

      <h2>State</h2>
      <ReactJson src={props.trace.latestStates} />
    </>
  );
}

// TODO: does all of this have to be bundled into one hook?
function useScenarios<St extends Json, Msg extends Json>(
  scenarios: Scenario<St, Msg>[]
): {
  trace: Trace<St, Msg>;
  sendInput: (fromUserID: number, input: Msg) => void;
  spawn: (id: number) => void;
  selectedScenarioID: string;
  setSelectedScenarioID: (id: string) => void;
} {
  const [traces, setTraces] = useState(
    scenarios.map((scenario) => ({ scenario, trace: scenario.initialState }))
  );
  const [selectedScenarioID, setSelectedScenarioID] = useHashParam(
    "scenario",
    scenarios[0].id
  );

  const selected = traces.find(
    (scenAndState) => scenAndState.scenario.id === selectedScenarioID
  );
  const trace = selected.trace;
  const scenario = selected.scenario;
  const setTrace = (newTrace) => {
    setTraces(
      updateList(
        traces,
        (scenState) => scenState.scenario.id === scenario.id,
        (scenState) => ({ ...scenState, trace: newTrace })
      )
    );
  };

  const sendInput = (fromUserID: number, input: Msg) => {
    const { newTrace, newMessageID } = insertUserInput(
      trace,
      scenario.update,
      fromUserID,
      input
    );
    setTrace(newTrace);
    stepAllAsync(
      newTrace,
      scenario.update,
      [
        {
          from: `user${fromUserID}`,
          to: `client${fromUserID}`,
          init: { type: "messageReceived", messageID: newMessageID.toString() },
        },
      ],
      setTrace
    );
  };

  const spawn = (id: number) => {
    const { newTrace: trace2, newMessages: nm1 } = Step.spawn(
      trace,
      scenario.update,
      `user${id}`,
      scenario.initialUserState
    );
    stepAllAsync(trace2, scenario.update, nm1, setTrace).then((trace3) => {
      const { newTrace: trace4, newMessages: nm2 } = Step.spawn(
        trace3,
        scenario.update,
        `client${id}`,
        scenario.initialClientState
      );
      stepAllAsync(trace4, scenario.update, nm2, setTrace);
    });
  };

  return { trace, sendInput, spawn, selectedScenarioID, setSelectedScenarioID };
}

function MultiClient<St extends Json, Msg extends Json>(props: {
  trace: Trace<St, Msg>;
  sendInput: (fromUserID: number, msg: Msg) => void;
  spawn: (id: number) => void;
  scenario: Scenario<St, Msg>;
}) {
  const [nextClientID, setNextClientID] = useState(0);
  const [clientIDs, setClientIDs] = useState<number[]>([]);

  return (
    <>
      <ul>
        {clientIDs.map((clientID) => {
          const clientState = props.trace.latestStates[`client${clientID}`];

          return (
            <li key={clientID}>
              <button
                onClick={() => {
                  setClientIDs(clientIDs.filter((id) => id !== clientID));
                }}
              >
                x
              </button>
              {clientState ? (
                <props.scenario.ui
                  state={clientState}
                  sendUserInput={(msg) => props.sendInput(clientID, msg)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => {
          setNextClientID(nextClientID + 1);
          setClientIDs([...clientIDs, nextClientID]);
          props.spawn(nextClientID);
        }}
      >
        Add Client
      </button>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
