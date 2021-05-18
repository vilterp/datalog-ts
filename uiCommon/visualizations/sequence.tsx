import React from "react";
import { VizTypeSpec } from "./typeSpec";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Res, StringLit } from "../../core/types";
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
      <div>
        <Diagram
          diagram={sequenceDiagram(makeSequenceSpec(actors, messages))}
        />
      </div>
    </div>
  );
}

// TODO: maybe integrate this into one of the above functions??
//   or not
function makeSequenceSpec(actors: Res[], messages: Res[]): Sequence {
  return {
    locations: actors.map((actor) => (actor.bindings.ID as StringLit).val),
    hops: messages.map((message) => ({
      from: {
        location: (message.bindings.FromActorID as StringLit).val,
        time: parseInt((message.bindings.FromTickID as StringLit).val),
      },
      to: {
        location: (message.bindings.ToActorID as StringLit).val,
        time: parseInt((message.bindings.ToTickID as StringLit).val),
      },
    })),
  };
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
