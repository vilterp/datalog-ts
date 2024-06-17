import React from "react";
import useResizeObserver from "use-resize-observer";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { rec, varr } from "../../../core/types";
import { SequenceDiagram } from "../../../uiCommon/visualizations/sequence";
import { TimeTravelAction } from "../types";

const STEPPER_WIDTH = 130;

export function TimeTravelSlider<St, Msg>(props: {
  interp: AbstractInterpreter;
  curIdx: number;
  historyLength: number;
  exploreEnabled: boolean;
  dispatch: (action: TimeTravelAction<St, Msg>) => void;
}) {
  const { ref, width } = useResizeObserver();

  const atEnd =
    props.historyLength === 0 || props.curIdx === props.historyLength - 1;

  return (
    <div ref={ref}>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <Stepper
          dispatch={props.dispatch}
          curIdx={props.curIdx}
          historyLength={props.historyLength}
        />
        <input
          type="range"
          min={0}
          max={props.historyLength - 1}
          value={props.curIdx}
          style={{ width: width - STEPPER_WIDTH }}
          onChange={(evt) =>
            props.dispatch({
              type: "TimeTravelTo",
              idx: parseInt(evt.target.value),
            })
          }
        />
        <button
          disabled={atEnd}
          onClick={() => props.dispatch({ type: "Branch" })}
        >
          Branch
        </button>{" "}
      </div>
      <SequenceDiagram
        interp={props.interp}
        id={"sequence"}
        spec={rec("sequence", {
          actors: rec("clientServerActor", { id: varr("ID") }),
          ticks: rec("clientServerTick", {
            time: varr("Time"),
            place: varr("Place"),
          }),
          hops: rec("clientServerHop", {
            from: varr("FromTick"),
            to: varr("ToTick"),
          }),
        })}
        width={width}
        highlightedTerm={null}
        setHighlightedTerm={() => {}}
        runStatements={() => {}}
      />
      {/* controls */}
      <ExploreForm
        disabled={props.exploreEnabled}
        onExplore={(steps) => props.dispatch({ type: "Explore", steps })}
      />
    </div>
  );
}

function Stepper<St, Msg>(props: {
  curIdx: number;
  historyLength: number;
  dispatch: (action: TimeTravelAction<St, Msg>) => void;
}) {
  return (
    <div style={{ width: STEPPER_WIDTH }}>
      <button
        disabled={props.curIdx === 0}
        onClick={() =>
          props.dispatch({
            type: "TimeTravelTo",
            idx: props.curIdx - 1,
          })
        }
      >
        {"<"}
      </button>{" "}
      {props.curIdx}/{props.historyLength - 1}{" "}
      <button
        disabled={props.curIdx === props.historyLength - 1}
        onClick={() =>
          props.dispatch({
            type: "TimeTravelTo",
            idx: props.curIdx + 1,
          })
        }
      >
        {">"}
      </button>
    </div>
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
