import * as React from "react";
import * as ReactDOM from "react-dom";
import { Explorer } from "../../uiCommon/explorer";
import ReactJson from "react-json-view";
import { Json } from "../../util/json";
import { Tabs } from "../../uiCommon/generic/tabs";
import { initialState, reducer } from "./reducers";
import { SYSTEMS } from "./systems";
import useHashParam from "use-hash-param";
import {
  SystemInstance,
  SystemInstanceAction,
  Trace,
  TraceAction,
  UpdateFn,
} from "./types";
import useThunkReducer, { Thunk } from "react-hook-thunk-reducer";
import { stepAllAsync } from "./step";
import { Dispatch } from "react";

function Main() {
  const [state, dispatch] = useThunkReducer(reducer, initialState(SYSTEMS));
  const [selectedSystemInstanceID, setSelectedSystemInstanceID] = useHashParam(
    "systemInstance",
    SYSTEMS[0].id
  );

  return (
    <>
      <h1>Communicating Processes Viz</h1>

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

type ThunkDispatch<S, A> = Dispatch<A | Thunk<S, A>>;

function SystemInstanceView<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  dispatch: ThunkDispatch<
    SystemInstance<St, Msg>,
    SystemInstanceAction<St, Msg>
  >;
}) {
  return (
    <>
      <MultiClient
        systemInstance={props.systemInstance}
        dispatch={props.dispatch}
      />

      <Explorer interp={props.systemInstance.trace.interp} showViz={true} />

      <h2>State</h2>
      <ReactJson src={props.systemInstance.trace.latestStates} />
    </>
  );
}

function MultiClient<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  // hoo that is a big type
  dispatch: ThunkDispatch<
    SystemInstance<St, Msg>,
    SystemInstanceAction<St, Msg>
  >;
}) {
  const sendInput = (clientID: number, input: Msg) => {
    props.dispatch((dispatch, getState) => {
      dispatch({
        type: "UpdateTrace",
        action: {
          type: "SendUserInput",
          clientID,
          input,
        },
      });
      dispatch(updateTrace(props.systemInstance.system.update));
    });
  };

  return (
    <>
      <ul>
        {props.systemInstance.clientIDs.map((clientID) => {
          const clientState =
            props.systemInstance.trace.latestStates[`client${clientID}`];

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
                <props.systemInstance.system.ui
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
          props.dispatch({
            type: "UpdateTrace",
            action: {
              type: "SpawnClient",
              id: props.systemInstance.nextClientID,
              initialUserState: props.systemInstance.system.initialUserState,
              initialClientState:
                props.systemInstance.system.initialClientState,
            },
          });
        }}
      >
        Add Client
      </button>
    </>
  );
}

function updateTrace<St extends Json, Msg extends Json>(
  update: UpdateFn<St, Msg>,
  action: TraceAction<St, Msg>
): Thunk<Trace<St>, TraceAction<St, Msg>> {
  return (dispatch, getState) => {
    dispatch(action);
    const trace = getState();

    stepAllAsync(trace, update, dispatch);
  };
}

ReactDOM.render(<Main />, document.getElementById("main"));
