import * as React from "react";
import { useState } from "react";
import * as ReactDOM from "react-dom";
import { Scenario } from "./scenario";
import { scenario as simpleClientServer } from "./scenarios/clientServer";
import { scenario as lsm } from "./scenarios/lsm";
import useHashParam from "use-hash-param";
import { TabbedTables } from "../../uiCommon/tabbedTables";
import { Trace } from "./model";

type ScenarioAndState<St, Msg> = {
  scenario: Scenario<St, Msg>;
  trace: Trace<St, Msg>;
};

const initialScenarioAndStates: ScenarioAndState<any, any>[] = [
  simpleClientServer,
  lsm,
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
                <scenario.ui
                  trace={trace}
                  setTrace={(newTrace) => {
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
                <pre>{JSON.stringify(trace.latestStates, null, 2)}</pre>

                <TabbedTables interp={trace.interp} />
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
