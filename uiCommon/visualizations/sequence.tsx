import React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { Int, Rec, Res, StringLit, Term } from "../../core/types";
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

function SequenceDiagram(props: VizArgs) {
  try {
    const actors = props.interp.queryRec(props.spec.attrs.actors as Rec);
    const messages = props.interp.queryRec(props.spec.attrs.messages as Rec);

    return (
      <div>
        <div>
          <Diagram<Term>
            diagram={sequenceDiagram(makeSequenceSpec(actors, messages))}
            onMouseOver={(term) => props.setHighlightedTerm?.(term)}
          />
        </div>
      </div>
    );
  } catch (e) {
    console.error("while evaluating sequence diagram:", e);
    return (
      <pre style={{ color: "red", fontFamily: "monospace" }}>
        {e.toString()}
      </pre>
    );
  }
}

// TODO: maybe integrate this into one of the above functions??
//   or not
function makeSequenceSpec(actors: Res[], messages: Res[]): Sequence {
  // TODO: don't we already know that a certain tick belongs to
  // a certain actor?
  return {
    locations: actors.map((actor) => ({
      loc: (actor.bindings.ID as StringLit).val,
      term: actor.term,
    })),
    hops: messages.map((message) => {
      const fromTickRec = message.bindings.FromTickID as Rec;
      const fromTick: Tick = {
        time: (fromTickRec.attrs.time as Int).val,
        place: (fromTickRec.attrs.place as StringLit).val,
        term: fromTickRec,
      };
      const toTickRec = message.bindings.ToTickID as Rec;
      const toTick: Tick = {
        time: (toTickRec.attrs.time as Int).val,
        place: (toTickRec.attrs.place as StringLit).val,
        term: toTickRec,
      };
      return {
        term: message.term,
        from: fromTick,
        to: toTick,
      };
    }),
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
  from: Tick;
  to: Tick;
}

interface Tick {
  place: Location;
  time: Time;
  term: Term;
}

function yForTime(t: Time): number {
  return t * 20;
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

function pointsForLocation(loc: Location, hops: Hop[]): Tick[] {
  return flatMap(hops, (hop) => {
    const out: Tick[] = [];
    if (hop.to.place === loc) {
      out.push(hop.to);
    }
    if (hop.from.place === loc) {
      out.push(hop.from);
    }
    return out;
  });
}
