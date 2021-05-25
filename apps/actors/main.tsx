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
import { insertUserInput, stepAll, stepAllAsync } from "./step";
import { updateList } from "../../util/util";

const SCENARIOS: Scenario<any, any>[] = [todoMVC, simpleCounter];

function Main() {
  const {
    trace,
    sendInput,
    selectedScenarioID,
    setSelectedScenarioID,
    multiClient,
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
                multiClient={multiClient}
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
  multiClient: MultiClientProps;
}) {
  return (
    <>
      <MultiClient
        trace={props.trace}
        sendInput={props.sendInput}
        scenario={props.scenario}
        multiClient={props.multiClient}
      />

      <Explorer interp={props.trace.interp} showViz={true} />

      <h2>State</h2>
      <ReactJson src={props.trace.latestStates} />
    </>
  );
}

type ScenState<ActorState, Msg> = {
  scenario: Scenario<ActorState, Msg>;
  trace: Trace<ActorState, Msg>;
  clientIDs: number[];
  nextClientID: number;
};

// TODO: does all of this have to be bundled into one hook?
function useScenarios<St extends Json, Msg extends Json>(
  scenarios: Scenario<St, Msg>[]
): {
  trace: Trace<St, Msg>;
  sendInput: (fromUserID: number, input: Msg) => void;
  selectedScenarioID: string;
  setSelectedScenarioID: (id: string) => void;
  multiClient: MultiClientProps;
} {
  const [scenStates, setScenStates] = useState<ScenState<any, any>[]>(
    scenarios.map((scenario) => ({
      scenario,
      trace: scenario.initialState,
      clientIDs: [],
      nextClientID: 0,
    }))
  );
  const [selectedScenarioID, setSelectedScenarioID] = useHashParam(
    "scenario",
    scenarios[0].id
  );

  const scenState = scenStates.find(
    (scenAndState) => scenAndState.scenario.id === selectedScenarioID
  );
  const trace = scenState.trace;
  const scenario = scenState.scenario;
  const updateScenState = (
    fn: (old: ScenState<St, Msg>) => ScenState<St, Msg>
  ) => {
    setScenStates(
      updateList(
        scenStates,
        (scenState) => scenState.scenario.id === scenario.id,
        fn
      )
    );
  };
  const setTrace = (newTrace) => {
    updateScenState((old) => ({ ...old, trace: newTrace }));
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

  const spawnClient = () => {
    const id = scenState.nextClientID;
    updateScenState((old) => ({
      ...old,
      nextClientID: old.nextClientID + 1,
      clientIDs: [...old.clientIDs, id],
    }));

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
  const exitClient = (id: number) => {
    updateScenState((old) => ({
      ...old,
      clientIDs: old.clientIDs.filter((curID) => curID !== id),
    }));
  };

  return {
    trace,
    sendInput,
    selectedScenarioID,
    setSelectedScenarioID,
    multiClient: {
      spawnClient,
      exitClient,
      clientIDs: scenState.clientIDs,
    },
  };
}

type MultiClientProps = {
  clientIDs: number[];
  spawnClient: () => void;
  exitClient: (id: number) => void;
};

function MultiClient<St extends Json, Msg extends Json>(props: {
  trace: Trace<St, Msg>;
  sendInput: (fromUserID: number, msg: Msg) => void;
  scenario: Scenario<St, Msg>;
  multiClient: MultiClientProps;
}) {
  return (
    <>
      <ul>
        {props.multiClient.clientIDs.map((clientID) => {
          const clientState = props.trace.latestStates[`client${clientID}`];

          return (
            <li key={clientID}>
              <button
                onClick={() => {
                  props.multiClient.exitClient(clientID);
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
      <button onClick={props.multiClient.spawnClient}>Add Client</button>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
