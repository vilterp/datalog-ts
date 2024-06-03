import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Explorer } from "../../uiCommon/explorer";
import ReactJson from "react-json-view";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";
import { initialState, reducer } from "./reducers";
import { SYSTEMS } from "./systems";
import useHashParam from "use-hash-param";
import { State, SystemInstance, SystemInstanceAction } from "./types";
import { useEffectfulReducer } from "../../uiCommon/generic/hooks";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";
import { MultiClient } from "./ui/multiClient";

const initialSystemsState = initialState(SYSTEMS);

function Main() {
  const [state, dispatch] = useEffectfulReducer(reducer, initialSystemsState);
  const [selectedSystemInstanceID, setSelectedSystemInstanceID] = useHashParam(
    "systemInstance",
    SYSTEMS[0].id
  );

  return (
    <div style={{ fontFamily: "helvetica" }}>
      <h1>Actor System Viz</h1>

      <p>
        Network latency:
        <input
          value={state.networkLatency}
          onChange={(evt) =>
            dispatch({
              type: "ChangeNetworkLatency",
              newLatency: parseInt(evt.target.value),
            })
          }
          type="range"
          min={0}
          max={10_000}
        />
        {state.networkLatency}ms
      </p>

      <Tabs
        setTabID={setSelectedSystemInstanceID}
        curTabID={selectedSystemInstanceID}
        tabs={state.systemInstances.map((systemInstance) => ({
          name: systemInstance.system.name,
          id: systemInstance.system.id,
          render: () => {
            return (
              <SystemInstanceView
                systemInstance={systemInstance}
                dispatch={(action) =>
                  dispatch({
                    type: "UpdateSystemInstance",
                    instanceID: systemInstance.system.id,
                    action,
                  })
                }
              />
            );
          },
        }))}
      />
    </div>
  );
}

function SystemInstanceView<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  dispatch: (action: SystemInstanceAction<St, Msg>) => void;
}) {
  return (
    <>
      <MultiClient
        systemInstance={props.systemInstance}
        dispatch={props.dispatch}
      />

      <CollapsibleWithHeading
        heading="Explorer"
        content={
          <Explorer interp={props.systemInstance.trace.interp} showViz={true} />
        }
      />

      <h2>State</h2>
      <ReactJson
        src={props.systemInstance.trace.latestStates}
        displayDataTypes={false}
        collapsed
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("main")).render(<Main />);
