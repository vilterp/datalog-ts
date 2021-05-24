import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import { scenario as simpleCounter } from "./scenarios/simpleCounter";
import { scenario as todoMVC } from "./scenarios/todoMVC";
import useHashParam from "use-hash-param";
import { Explorer } from "../../uiCommon/explorer";
import { Scenario, Trace, UpdateFn } from "./types";
import ReactJson from "react-json-view";
import * as Step from "./step";
import { updateList } from "../../util/util";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";
import { insertUserInput, stepAllAsync } from "./step";

const SCENARIOS: Scenario<any, any>[] = [todoMVC, simpleCounter];

function Main() {
  const [curTabID, setTabID] = useHashParam("scenario", SCENARIOS[0].id);

  return (
    <>
      <h1>Communicating Processes Viz</h1>

      <Tabs
        setTabID={setTabID}
        curTabID={curTabID}
        tabs={SCENARIOS.map((scenario) => ({
          name: scenario.name,
          id: scenario.id,
          render: () => {
            return <Animated scenario={scenario} />;
          },
        }))}
      />
    </>
  );
}

function Animated<ActorState extends Json, Msg extends Json>(props: {
  scenario: Scenario<ActorState, Msg>;
}) {
  const { trace, sendInput, spawn } = useScenario(props.scenario);

  return (
    <>
      <MultiClient
        trace={trace}
        sendInput={sendInput}
        spawn={spawn}
        scenario={props.scenario}
      />

      <Explorer interp={trace.interp} showViz={true} />

      <h2>State</h2>
      <ReactJson src={trace.latestStates} />
    </>
  );
}

function useScenario<St extends Json, Msg extends Json>(
  scenario: Scenario<St, Msg>
): {
  trace: Trace<St, Msg>;
  sendInput: (fromUserID: number, input: Msg) => void;
  spawn: (id: number) => void;
} {
  const [trace, setTrace] = useState(scenario.initialState);

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
    const trace1 = Step.spawn(
      trace,
      scenario.update,
      `client${id}`,
      scenario.initialClientState
    );
    const trace2 = Step.spawn(
      trace1,
      scenario.update,
      `user${id}`,
      scenario.initialUserState
    );
    setTrace(trace2);
  };

  return { trace, sendInput, spawn };
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
                sendUserInput={(msg) => props.sendInput(clientID, msg)}
              />
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
