import React from "react";
import { Json } from "../../../util/json";
import {
  SystemInstance,
  SystemInstanceAction,
  TimeTravelAction,
  TraceAction,
} from "../types";
import { Window } from "./window";
import { TimeTravelSlider } from "./timeTravelSlider";
import { ExploreArea } from "./explore";

export function MultiClient<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  dispatch: (action: TimeTravelAction<St, Msg>) => void;
}) {
  const curState =
    props.systemInstance.stateHistory[props.systemInstance.currentStateIdx];
  const lastState =
    props.systemInstance.stateHistory[
      props.systemInstance.stateHistory.length - 1
    ];

  const advance = (action: SystemInstanceAction<St, Msg>) => {
    props.dispatch({ type: "Advance", action });
  };

  const updateTrace = (action: TraceAction<St, Msg>) => {
    advance({ type: "UpdateTrace", action });
  };

  const sendInput = (clientID: string, input: Msg) => {
    updateTrace({
      type: "SendUserInput",
      clientID,
      input,
    });
  };

  const addClient = () => {
    advance({ type: "AllocateClientID" });
    // TODO: DRY this up with other place client id is constructed
    const clientID = `client${curState.nextClientID}`;

    updateTrace({
      type: "SpawnClient",
      id: curState.nextClientID.toString(),
      initialUserState: props.systemInstance.system.initialUserState,
      initialClientState:
        props.systemInstance.system.initialClientState(clientID),
    });
  };

  const exploreEnabled =
    props.systemInstance.system.chooseNextMove === undefined;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          overflow: "scroll",
        }}
      >
        {curState.clientIDs.map((clientID) => {
          const clientState = curState.trace.latestStates[`client${clientID}`];

          return (
            <Window
              key={clientID}
              name={`Client ${clientID}`}
              onClose={() => {
                advance({ type: "ExitClient", clientID });
              }}
            >
              {clientState ? (
                <props.systemInstance.system.ui
                  state={clientState}
                  sendUserInput={(input) => sendInput(clientID, input)}
                />
              ) : null}
            </Window>
          );
        })}
        <AddClientButton onClick={() => addClient()} />
      </div>

      <TimeTravelSlider<St, Msg>
        interp={lastState.trace.interp}
        curIdx={props.systemInstance.currentStateIdx}
        historyLength={props.systemInstance.stateHistory.length}
        dispatch={(evt) => props.dispatch(evt)}
      />

      <ExploreArea
        disabled={!exploreEnabled}
        onExplore={(steps) => props.dispatch({ type: "Explore", steps })}
        onDoRandomMove={() => props.dispatch({ type: "DoRandomMove" })}
      />
    </>
  );
}

function AddClientButton(props: { onClick: () => void }) {
  return (
    <div
      style={{
        border: "3px dashed lightgrey",
        padding: 10,
        margin: 10,
        borderRadius: 10,
        width: 400,
        height: 320,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <button onClick={() => props.onClick()}>Add Client</button>
    </div>
  );
}
