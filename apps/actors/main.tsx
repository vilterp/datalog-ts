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
import { IncrementalInterpreter } from "../../core/incremental/interpreter";
import { toGraphviz } from "../../core/incremental/graphviz";
import { prettyPrintGraph } from "../../util/graphviz";

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

  // TODO: show rule graph in the explorer???
  // console.log(
  //   prettyPrintGraph(toGraphviz((trace.interp as IncrementalInterpreter).graph))
  // );

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
