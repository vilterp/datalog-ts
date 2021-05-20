import * as React from "react";
import { useState } from "react";
import * as ReactDOM from "react-dom";
import { scenario as simpleClientServer } from "./scenarios/clientServer";
import { scenario as todoMVC } from "./scenarios/todoMVC";
import useHashParam from "use-hash-param";
import { Explorer } from "../../uiCommon/explorer";
import { Scenario, Trace } from "./types";
import ReactJson from "react-json-view";
import { sendUserInput } from "./step";

type ScenarioAndState<St, Msg> = {
  scenario: Scenario<St, Msg>;
  trace: Trace<St, Msg>;
};

const initialScenarioAndStates: ScenarioAndState<any, any>[] = [
  todoMVC,
  simpleClientServer,
].map((scenario) => ({ scenario, trace: scenario.initialState }));

function Main() {
  const [scenarioAndStates, setScenarioAndStates] = useState<
    ScenarioAndState<any, any>[]
  >(initialScenarioAndStates);

  return (
    <>
      <h1>Communicating Processes Viz</h1>

      <Tabs
        tabs={scenarioAndStates.map((scenarioAndState) => ({
          name: scenarioAndState.scenario.name,
          id: scenarioAndState.scenario.id,
          render: () => {
            const trace = scenarioAndState.trace;
            const scenario = scenarioAndState.scenario;

            return (
              <>
                {/*TODO: make it more clear you have to have an actor with id "client"??*/}
                {/*I guess this will become more clear with multi-client*/}
                <scenario.ui
                  state={trace.latestStates.client}
                  sendUserInput={(msg) => {
                    const newTrace = sendUserInput(trace, scenario.update, msg);
                    setScenarioAndStates(
                      updateList(
                        scenarioAndStates,
                        (ss) => ss.scenario.name === scenario.name,
                        (ss) => ({ ...ss, trace: newTrace })
                      )
                    );
                  }}
                />

                <h2>State</h2>
                <ReactJson src={trace.latestStates} />

                <Explorer interp={trace.interp} showViz={true} />
              </>
            );
          },
        }))}
      />
    </>
  );
}

function Tabs(props: {
  tabs: { name: string; id: string; render: () => React.ReactElement }[];
}) {
  const [curTabID, setTabID] = useHashParam("scenario", props.tabs[0].id);

  return (
    <div>
      <ul>
        {props.tabs.map((tab) => (
          <li
            style={{
              cursor: "pointer",
              fontWeight: tab.id === curTabID ? "bold" : "normal",
            }}
            onClick={() => setTabID(tab.id)}
            key={tab.id}
          >
            {tab.name}
          </li>
        ))}
      </ul>
      <div>{props.tabs.find((tab) => tab.id === curTabID).render()}</div>
    </div>
  );
}

// TODO: how do I not have this as a util?
function updateList<T>(
  list: T[],
  predicate: (t: T) => boolean,
  update: (t: T) => T
) {
  return list.map((item) => (predicate(item) ? update(item) : item));
}

ReactDOM.render(<Main />, document.getElementById("main"));
