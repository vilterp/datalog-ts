import React from "react";
import { useState } from "react";
import { int, rec } from "../../core/types";
import { VizArgs, VizTypeSpec } from "./typeSpec";

export const ticker: VizTypeSpec = {
  name: "Ticker",
  description: "insert a fact on a tick",
  component: Ticker,
};

function Ticker(props: VizArgs) {
  const [intervalID, setIntervalID] = useState(null);
  // const [time, setTime] = useState(0);

  const toggleTick = () => {
    if (intervalID === null) {
      let time = 0;
      setIntervalID(
        setInterval(() => {
          // console.log("hello?", time);
          props.runStatements([
            { type: "Fact", record: rec("time", { time: int(time) }) },
          ]);
          time++;
          // setTime(time + 1);
        }, 100)
      );
    } else {
      clearInterval(intervalID);
      setIntervalID(null);
    }
  };

  return (
    <button onClick={toggleTick}>
      {intervalID === null ? "Start" : "Stop"}
    </button>
  );
}
