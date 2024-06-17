import React from "react";
import useResizeObserver from "use-resize-observer";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import { rec, varr } from "../../../core/types";
import { SequenceDiagram } from "../../../uiCommon/visualizations/sequence";
import { TimeTravelAction } from "../types";

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
      {/* controls */}
      <div>
        {props.curIdx}/{props.historyLength - 1}{" "}
        <button
          disabled={atEnd}
          onClick={() => props.dispatch({ type: "Branch" })}
        >
          Branch
        </button>{" "}
        <ExploreForm
          disabled={props.exploreEnabled}
          onExplore={(steps) => props.dispatch({ type: "Explore", steps })}
        />
      </div>
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
