import React from "react";
import { VizTypeSpec } from "./typeSpec";
import { Interpreter } from "../../core/interpreter";
import { Rec, StringLit } from "../../core/types";
import { SimpleTermView } from "../term";

export const sequence: VizTypeSpec = {
  name: "Sequence Diagram",
  description: "visualize multiple processes interacting over time",
  component: SequenceDiagram,
};

function SequenceDiagram(props: { interp: Interpreter; spec: Rec }) {
  const actors = props.interp.queryStr(
    (props.spec.attrs.actors as StringLit).val
  );
  const messages = props.interp.queryStr(
    (props.spec.attrs.messages as StringLit).val
  );
  const ticks = props.interp.queryStr(
    (props.spec.attrs.ticks as StringLit).val
  );

  return (
    <div>
      Hello world. This is a sequence diagram. Spec:{" "}
      <SimpleTermView term={props.spec} />
      Actors:
      <ul>
        {actors.results.map((actor) => (
          <li>
            <SimpleTermView term={actor.term} />
          </li>
        ))}
      </ul>
      Messages:
      <ul>
        {messages.results.map((message) => (
          <li>
            <SimpleTermView term={message.term} />
          </li>
        ))}
      </ul>
      Ticks:
      <ul>
        {ticks.results.map((tick) => (
          <li>
            <SimpleTermView term={tick.term} />
          </li>
        ))}
      </ul>
    </div>
  );
}
