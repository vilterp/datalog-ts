import React from "react";
import { VizTypeSpec } from "./typeSpec";
import { Interpreter } from "../../core/interpreter";
import { Rec } from "../../core/types";
import { SimpleTermView } from "../term";

export const sequence: VizTypeSpec = {
  name: "Sequence Diagram",
  description: "visualize multiple processes interacting over time",
  component: SequenceDiagram,
};

function SequenceDiagram(props: { interp: Interpreter; spec: Rec }) {
  return (
    <>
      Hello world. This is a sequence diagram. Spec:{" "}
      <SimpleTermView term={props.spec} />
    </>
  );
}
