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
