import React from "react";
import { VizTypeSpec } from "./typeSpec";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit } from "../../core/types";
import { SimpleTermView } from "../term";
import {
  AbsPos,
  Circle,
  Diag,
  EMPTY_DIAGRAM,
  HLayout,
  Line,
  ORIGIN,
  Tag,
  Text,
  VLayout,
  ZLayout,
} from "../diagrams/types";
import { Diagram } from "../diagrams/render";
import { getCoords } from "../diagrams/getCoords";
import { flatMap } from "../../util/util";

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
      <h4>Test diagram:</h4>
      <Diagram diagram={sequenceDiagram(TEST_SEQ)} />
    </div>
  );
}

export type Location = string;
export type Time = number;

export interface Sequence {
  locations: Location[];
  hops: Hop[];
}

export interface Hop {
  from: TimeAndPlace;
  to: TimeAndPlace;
}

interface TimeAndPlace {
  location: Location;
  time: Time;
}

function yForTime(t: Time): number {
  return t * 10;
}

const TEST_SEQ: Sequence = {
  locations: ["New York", "Dublin", "Stockholm", "London", "Munich"],
  hops: [
    {
      from: { location: "New York", time: 0 },
      to: { location: "Dublin", time: 10 },
    },
    // layover
    {
      from: { location: "Dublin", time: 10 },
      to: { location: "Dublin", time: 16 },
    },
    {
      from: { location: "Dublin", time: 16 },
      to: { location: "Stockholm", time: 19 },
    },
  ],
};

export function sequenceDiagram(seq: Sequence): Diag<TimeAndPlace> {
  const locationLines = AbsPos(
    { x: 40, y: 20 },
    HLayout(
      seq.locations.map((loc) =>
        VLayout([
          Text({
            text: loc,
            fontSize: 10,
          }),
          ZLayout([
            Line({
              width: 1,
              stroke: "black",
              start: ORIGIN,
              end: { x: 0, y: 200 },
            }),
            ...pointsForLocation(loc, seq.hops).map((tp) =>
              AbsPos(
                { x: 0, y: yForTime(tp.time) },
                Tag<TimeAndPlace>(tp, EMPTY_DIAGRAM)
              )
            ),
          ]),
        ])
      )
    )
  );
  const dots = ZLayout(
    flatMap(seq.locations, (loc) =>
      pointsForLocation(loc, seq.hops).map((pt) => {
        const coords = getCoords(locationLines, pt);
        if (coords === null) {
          return EMPTY_DIAGRAM;
        }
        return AbsPos(
          coords,
          Circle({
            radius: 5,
            fill: "red",
          })
        );
      })
    )
  );
  const hops = ZLayout(
    seq.hops.map((hop) => {
      const fromCoords = getCoords(locationLines, hop.from);
      const toCoords = getCoords(locationLines, hop.to);
      if (fromCoords === null || toCoords === null) {
        return EMPTY_DIAGRAM;
      }
      return Line({
        stroke: "blue",
        width: 3,
        start: fromCoords,
        end: toCoords,
      });
    })
  );
  return ZLayout([locationLines, hops, dots]);
}

function pointsForLocation(loc: Location, hops: Hop[]): TimeAndPlace[] {
  return flatMap(hops, (hop) => {
    const out: TimeAndPlace[] = [];
    if (hop.to.location === loc) {
      out.push(hop.to);
    }
    if (hop.from.location === loc) {
      out.push(hop.from);
    }
    return out;
  });
}
