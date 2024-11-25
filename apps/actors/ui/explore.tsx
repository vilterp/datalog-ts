import React, { useState } from "react";

const DEFAULT_STEP_LIMIT = 100;

export function ExploreArea(props: {
  exploreEnabled: boolean;
  onExplore: (steps: number) => void;
  onDoRandomMove: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      <ExploreForm
        enabled={!props.exploreEnabled}
        onExplore={props.onExplore}
      />
      or
      <ExploreTicker
        enabled={!props.exploreEnabled}
        onDoRandomMove={props.onDoRandomMove}
      />
    </div>
  );
}

function ExploreForm(props: {
  enabled: boolean;
  onExplore: (steps: number) => void;
}) {
  const [steps, setSteps] = React.useState(DEFAULT_STEP_LIMIT);

  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        props.onExplore(steps);
      }}
    >
      <button type="submit" disabled={!props.enabled}>
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

function ExploreTicker(props: {
  enabled: boolean;
  onDoRandomMove: () => void;
}) {
  const [intervalID, setIntervalID] = useState<number | null>(null);
  const [intervalMS, setIntervalMS] = useState(500);

  const handleClick = () => {
    if (intervalID === null) {
      const intervalID = window.setInterval(() => {
        props.onDoRandomMove();
      }, intervalMS);
      setIntervalID(intervalID);
    } else {
      clearInterval(intervalID);
      setIntervalID(null);
    }
  };

  return (
    <form onSubmit={(evt) => evt.preventDefault()}>
      <button disabled={!props.enabled} onClick={() => handleClick()}>
        {intervalID !== null ? "Stop Exploring" : "Start Exploring"}
      </button>
      {" every "}
      <input
        type="number"
        value={intervalMS}
        min={0}
        max={3000}
        onChange={(evt) => setIntervalMS(parseInt(evt.target.value))}
      />
      ms{" "}
    </form>
  );
}
