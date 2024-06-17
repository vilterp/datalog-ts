import React from "react";
import { Json } from "../../../util/json";
import {
  SystemInstance,
  SystemInstanceAction,
  TimeTravelAction,
  TraceAction,
} from "../types";
import { Window } from "./window";
import { SequenceDiagram } from "../../../uiCommon/visualizations/sequence";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { rec, varr } from "../../../core/types";
import useResizeObserver from "use-resize-observer";

export function MultiClient<St extends Json, Msg extends Json>(props: {
  systemInstance: SystemInstance<St, Msg>;
  dispatch: (action: TimeTravelAction<St, Msg>) => void;
}) {
  const curState =
    props.systemInstance.stateHistory[props.systemInstance.currentStateIdx];

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
        interp={props.systemInstance.interp}
        curIdx={props.systemInstance.currentStateIdx}
        historyLength={props.systemInstance.stateHistory.length}
        dispatch={(evt) => props.dispatch(evt)}
      />

      <ExploreForm
        disabled={props.systemInstance.system.chooseNextMove === undefined}
        onExplore={(steps) => props.dispatch({ type: "Explore", steps })}
      />
    </>
  );
}

const DEFAULT_STEP_LIMIT = 100;

function ExploreForm(props: {
  disabled: boolean;
  onExplore: (steps: number) => void;
}) {
  const [steps, setSteps] = React.useState(DEFAULT_STEP_LIMIT);

  return (
    <form onSubmit={() => props.onExplore(steps)}>
      <button type="submit" disabled={props.disabled}>
        Explore
      </button>{" "}
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

function TimeTravelSlider<St, Msg>(props: {
  interp: AbstractInterpreter;
  curIdx: number;
  historyLength: number;
  dispatch: (action: TimeTravelAction<St, Msg>) => void;
}) {
  const { ref, width } = useResizeObserver();

  const atEnd =
    props.historyLength === 0 || props.curIdx === props.historyLength - 1;

  return (
    <div ref={ref}>
      <input
        type="range"
        min={0}
        max={props.historyLength - 1}
        value={props.curIdx}
        style={{ width: width - 40 }}
        onChange={(evt) =>
          props.dispatch({
            type: "TimeTravelTo",
            idx: parseInt(evt.target.value),
          })
        }
      />
      <SequenceDiagram
        interp={props.interp}
        id={"sequence"}
        spec={rec("sequence", {
          actors: rec("actor", { id: varr("ID") }),
          hops: rec("hop", { from: varr("FromTick"), to: varr("ToTick") }),
        })}
        width={width}
        highlightedTerm={null}
        setHighlightedTerm={() => {
          throw new Error("Function not implemented.");
        }}
        runStatements={() => {
          throw new Error("Function not implemented.");
        }}
      />
      {props.curIdx}/{props.historyLength - 1}{" "}
      <button
        disabled={atEnd}
        onClick={() => props.dispatch({ type: "Branch" })}
      >
        Branch
      </button>
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
