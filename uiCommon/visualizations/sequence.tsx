import React from "react";
import { VizTypeSpec } from "./typeSpec";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Res, StringLit, Term } from "../../core/types";
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
} from "../../util/diagrams/types";
import { Diagram } from "../../util/diagrams/render";
import { getCoords } from "../../util/diagrams/getCoords";
import { flatMap } from "../../util/util";

export const sequence: VizTypeSpec = {
  name: "Sequence Diagram",
  description: "visualize multiple processes interacting over time",
  component: SequenceDiagram,
};

function SequenceDiagram(props: {
  interp: AbstractInterpreter;
  spec: Rec;
  setHighlightedTerm: (t: Term | null) => void;
}) {
  const actors = props.interp.queryStr(
    (props.spec.attrs.actors as StringLit).val
  );
  const messages = props.interp.queryStr(
    (props.spec.attrs.messages as StringLit).val
  );
  const ticks = props.interp.queryStr(
    (props.spec.attrs.ticks as StringLit).val
  );
  const ticksByID: { [id: string]: Term } = {};
  ticks.forEach((tick) => {
    ticksByID[((tick.term as Rec).attrs.id as StringLit).val] = tick.term;
  });

  return (
    <div>
      <div>
        <Diagram<Term>
          diagram={sequenceDiagram(
            makeSequenceSpec(actors, messages, ticksByID)
          )}
          onMouseOver={(term) => props.setHighlightedTerm?.(term)}
        />
      </div>
    </div>
  );
}

// TODO: maybe integrate this into one of the above functions??
//   or not
function makeSequenceSpec(
  actors: Res[],
  messages: Res[],
  ticksByID: { [id: string]: Term }
): Sequence {
  return {
    locations: actors.map((actor) => ({
      loc: (actor.bindings.ID as StringLit).val,
      term: actor.term,
    })),
    hops: messages.map((message) => ({
      term: message.term,
      from: {
        location: (message.bindings.FromActorID as StringLit).val,
        time: parseInt((message.bindings.FromTickID as StringLit).val),
        term: ticksByID[(message.bindings.FromTickID as StringLit).val],
      },
      to: {
        location: (message.bindings.ToActorID as StringLit).val,
        time: parseInt((message.bindings.ToTickID as StringLit).val),
        term: ticksByID[(message.bindings.ToTickID as StringLit).val],
      },
    })),
  };
}

export type Location = string;
export type Time = number;

export interface Sequence {
  locations: { loc: Location; term: Term }[];
  hops: Hop[];
}

export interface Hop {
  term: Term;
  from: TimeAndPlace;
  to: TimeAndPlace;
}

interface TimeAndPlace {
  location: Location;
  time: Time;
  term: Term;
}

function yForTime(t: Time): number {
  return t * 10;
}

export function sequenceDiagram(seq: Sequence): Diag<Term> {
  const maxTime = seq.hops.reduce(
    (prev, hop) => Math.max(prev, hop.to.time, hop.from.time),
    0
  );

  const locationLines: Diag<Term> = AbsPos(
    { x: 40, y: 20 },
    HLayout(
      seq.locations.map((loc) =>
        VLayout([
          Tag(
            loc.term,
            Text({
              text: loc.loc,
              fontSize: 10,
            })
          ),
          ZLayout([
            Line({
              width: 1,
              stroke: "black",
              start: ORIGIN,
              end: { x: 0, y: yForTime(maxTime) + 20 },
            }),
            ...pointsForLocation(loc.loc, seq.hops).map((tp) =>
              AbsPos(
                { x: 0, y: yForTime(tp.time) },
                Tag(
                  tp.term,
                  Circle({
                    radius: 5,
                    fill: "red",
                  })
                )
              )
            ),
          ]),
        ])
      )
    )
  );
  const hops = ZLayout(
    seq.hops.map((hop) => {
      const fromCoords = getCoords(locationLines, hop.from.term);
      const toCoords = getCoords(locationLines, hop.to.term);
      if (fromCoords === null || toCoords === null) {
        return EMPTY_DIAGRAM;
      }
      return Tag(
        hop.term,
        Line({
          stroke: "blue",
          width: 3,
          start: fromCoords,
          end: toCoords,
        })
      );
    })
  );
  return ZLayout<Term>([hops, locationLines]);
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
