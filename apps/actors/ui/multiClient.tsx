import React, { useState } from "react";
import { Json } from "../../../util/json";
import { SystemInstance, SystemInstanceAction, TraceAction } from "../types";
import { Window } from "./window";

export function MultiClient<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  dispatch: (action: SystemInstanceAction<St, Msg>) => void;
}) {
  const curState =
    props.systemInstance.stateHistory[props.systemInstance.currentStateIdx];

  const updateTrace = (action: TraceAction<St, Msg>) => {
    props.dispatch({ type: "UpdateTrace", action });
  };

  const sendInput = (clientID: string, input: Msg) => {
    updateTrace({
      type: "SendUserInput",
      clientID,
      input,
    });
  };

  const addClient = () => {
    props.dispatch({ type: "AllocateClientID" });
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

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        {curState.clientIDs.map((clientID) => {
          const clientState = curState.trace.latestStates[`client${clientID}`];

          return (
            <Window
              key={clientID}
              name={`Client ${clientID}`}
              onClose={() => {
                props.dispatch({ type: "ExitClient", clientID });
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

      <TimeTravelSlider
        curIdx={props.systemInstance.currentStateIdx}
        historyLength={props.systemInstance.stateHistory.length}
        onChange={(newIdx) =>
          props.dispatch({ type: "TimeTravelTo", idx: newIdx })
        }
      />

      {props.systemInstance.system.chooseNextMove ? (
        <ExploreForm
          onExplore={(steps) => props.dispatch({ type: "Explore", steps })}
        />
      ) : null}
    </>
  );
}

const DEFAULT_STEP_LIMIT = 100;

function ExploreForm(props: { onExplore: (steps: number) => void }) {
  const [steps, setSteps] = React.useState(DEFAULT_STEP_LIMIT);

  return (
    <form onSubmit={() => props.onExplore(steps)}>
      <button type="submit">Explore</button>{" "}
      <input
        type="number"
        min={0}
        max={3_000}
        value={steps}
        onChange={(evt) => setSteps(parseInt(evt.target.value))}
      />{" "}
      steps
    </form>
  );
}

function TimeTravelSlider(props: {
  curIdx: number;
  historyLength: number;
  onChange: (newIdx: number) => void;
}) {
  return (
    <div>
      <input
        type="range"
        min={0}
        max={props.historyLength - 1}
        value={props.curIdx}
        onChange={(evt) => {
          props.onChange(parseInt(evt.target.value));
        }}
      />
      {props.curIdx}/ {props.historyLength - 1}
    </div>
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
