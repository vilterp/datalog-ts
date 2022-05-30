import React from "react";
import { int, Int, Term } from "../../../core/types";
import { BareTerm } from "../../dl/replViews";
import { SliderSpec, TermEditorSpec } from "./types";

export function TermEditor(props: {
  spec: TermEditorSpec;
  term: Term;
  onChange: (newTerm: Term) => void;
}) {
  if (!props.spec) {
    // TODO: really need a simple version of this
    return <BareTerm term={props.term} />;
  }
  switch (props.spec.type) {
    case "Slider":
      return (
        <Slider
          spec={props.spec}
          value={(props.term as Int).val}
          onChange={(val) => {
            props.onChange(int(val));
          }}
        />
      );
    default:
      throw new Error(`unknown editor type: ${props.spec.type}`);
  }
}

function Slider(props: {
  spec: SliderSpec;
  value: number;
  onChange: (newVal: number) => void;
}) {
  return (
    <>
      <input
        type="range"
        min={props.spec.min}
        max={props.spec.max}
        step={0.1}
        value={props.value}
        onChange={(evt) => {
          props.onChange(parseInt(evt.target.value));
        }}
      />
      <BareTerm term={int(props.value)} />
    </>
  );
}
