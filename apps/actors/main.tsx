import * as React from "react";
import * as ReactDOM from "react-dom";
import { Explorer } from "../../uiCommon/explorer";
import ReactJson from "react-json-view";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";
import { initialState, reducer } from "./reducers";
import { SYSTEMS } from "./systems";
import useHashParam from "use-hash-param";
import { SystemInstance, SystemInstanceAction } from "./types";
import { useEffectfulReducer } from "../../uiCommon/generic/hooks";
import { CollapsibleWithHeading } from "../../uiCommon/generic/collapsible";

const initialSystemsState = initialState(SYSTEMS);

function Main() {
  const [state, dispatch] = useEffectfulReducer(reducer, initialSystemsState);
  const [selectedSystemInstanceID, setSelectedSystemInstanceID] = useHashParam(
    "systemInstance",
    SYSTEMS[0].id
  );

  return (
    <>
      <h1>Actor System Viz</h1>

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
    </>
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

function MultiClient<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  // hoo that is a big type
  dispatch: (action: SystemInstanceAction<St, Msg>) => void;
}) {
  const sendInput = (clientID: string, input: Msg) => {
    props.dispatch({
      type: "UpdateTrace",
      action: {
        type: "SendUserInput",
        clientID,
        input,
      },
    });
  };

  return (
    <>
      <button
        onClick={() => {
          props.dispatch({ type: "AllocateClientID" });
          // TODO: DRY this up with other place client id is constructed
          const clientID = `client${props.systemInstance.nextClientID}`;
          props.dispatch({
            type: "UpdateTrace",
            action: {
              type: "SpawnClient",
              id: props.systemInstance.nextClientID.toString(),
              initialUserState: props.systemInstance.system.initialUserState,
              initialClientState:
                props.systemInstance.system.initialClientState(clientID),
            },
          });
        }}
      >
        Add Client
      </button>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {props.systemInstance.clientIDs.map((clientID) => {
              return (
                <th
                  key={clientID}
                  style={{
                    borderLeft: "1px solid lightgrey",
                    borderRight: "1px solid lightgrey",
                    borderBottom: "1px solid black",
                  }}
                >
                  <span> client{clientID}</span>{" "}
                  <button
                    onClick={() => {
                      props.dispatch({ type: "ExitClient", clientID });
                    }}
                  >
                    x
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            {props.systemInstance.clientIDs.map((clientID) => {
              const clientState =
                props.systemInstance.trace.latestStates[`client${clientID}`];

              return (
                <td
                  key={clientID}
                  style={{
                    borderLeft: "1px solid lightgrey",
                    borderRight: "1px solid lightgrey",
                    verticalAlign: "top",
                  }}
                >
                  {clientState ? (
                    <props.systemInstance.system.ui
                      state={clientState}
                      sendUserInput={(input) => sendInput(clientID, input)}
                    />
                  ) : null}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </>
  );
}

ReactDOM.render(<Main />, document.getElementById("main"));
