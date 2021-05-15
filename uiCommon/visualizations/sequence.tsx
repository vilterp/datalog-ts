import React from "react";
import { VizTypeSpec } from "./typeSpec";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit } from "../../core/types";
import { SimpleTermView } from "../term";

export const sequence: VizTypeSpec = {
  name: "Sequence Diagram",
  description: "visualize multiple processes interacting over time",
  component: SequenceDiagram,
};

function SequenceDiagram(props: { interp: AbstractInterpreter; spec: Rec }) {
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
        {actors.map((actor) => (
          <li key={((actor.term as Rec).attrs.id as StringLit).val}>
            <SimpleTermView term={actor.term} />
          </li>
        ))}
      </ul>
      Messages:
      <ul>
        {messages.map((message) => (
          <li key={((message.term as Rec).attrs.id as StringLit).val}>
            <SimpleTermView term={message.term} />
          </li>
        ))}
      </ul>
      Ticks:
      <ul>
        {ticks.map((tick) => (
          <li key={((tick.term as Rec).attrs.id as StringLit).val}>
            <SimpleTermView term={tick.term} />
          </li>
        ))}
      </ul>
    </div>
  );
}
