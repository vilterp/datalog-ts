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
import { flatMap, uniqBy } from "../../util/util";
import { jsonEq } from "../../util/json";
import { termEq } from "../../core/unify";
import { ppt } from "../../core/pretty";
import { linearInterpolate } from "../../util/diagrams/util";

export const sequence: VizTypeSpec = {
  name: "Sequence Diagram",
  description: "visualize multiple processes interacting over time",
  component: SequenceDiagram,
};

export function SequenceDiagram(props: VizArgs & { width: number }) {
  try {
    const actors = props.interp.queryRec(props.spec.attrs.actors as Rec);
    const hops = props.interp.queryRec(props.spec.attrs.hops as Rec);
    const tickColors = props.spec.attrs.tickColor
      ? props.interp.queryRec(props.spec.attrs.tickColor as Rec)
      : [];
    const hopColors = props.spec.attrs.hopColor
      ? props.interp.queryRec(props.spec.attrs.hopColor as Rec)
      : [];

    const spec = makeSequenceSpec(actors, hops, tickColors, hopColors);

    return (
      <div>
        <Diagram<Term>
          diagram={sequenceDiagram(spec, props.highlightedTerm, props.width)}
          onMouseOver={(term) => props.setHighlightedTerm?.(term)}
        />
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

const DEFAULT_TICK_COLOR = "lightblue";
const DEFAULT_HOP_COLOR = "blue";

const HOP_HIGHLIGHT_COLOR = "orange";
const TICK_HIGHLIGHT_COLOR = "orange";

// TODO: maybe integrate this into one of the above functions??
//   or not
function makeSequenceSpec(
  actors: Res[],
  hops: Res[],
  tickColors: Res[],
  hopColors: Res[]
): Sequence {
  const locations = uniqBy((res) => ppt(res.bindings.ID), actors);
  // color by tick
  const colorByTick = {};
  tickColors.forEach((tickColor) => {
    colorByTick[ppt(tickColor.bindings.Tick)] = (
      tickColor.bindings.Color as StringLit
    ).val;
  });
  // color by hop
  const colorByHop = {};
  hopColors.forEach((hopColor) => {
    colorByHop[pptHop(hopColor)] = (hopColor.bindings.Color as StringLit).val;
  });
  return {
    locations: locations.map((actor) => ({
      loc: (actor.bindings.ID as StringLit).val,
      term: actor.term,
    })),
    hops: hops.map((hop) => {
      const fromTickRec = hop.bindings.FromTick as Rec;
      const fromTick: Tick = {
        time: (fromTickRec.attrs.time as Int).val,
        place: (fromTickRec.attrs.place as StringLit).val,
        term: fromTickRec,
        color: colorByTick[ppt(fromTickRec)] || DEFAULT_TICK_COLOR,
      };
      const toTickRec = hop.bindings.ToTick as Rec;
      const toTick: Tick = {
        time: (toTickRec.attrs.time as Int).val,
        place: (toTickRec.attrs.place as StringLit).val,
        term: toTickRec,
        color: colorByTick[ppt(toTickRec)] || DEFAULT_TICK_COLOR,
      };
      return {
        term: hop.term,
        from: fromTick,
        to: toTick,
        color: colorByHop[pptHop(hop)] || DEFAULT_HOP_COLOR,
      };
    }),
  };
}

function pptHop(hop: Res): string {
  return ppt(hop.bindings.FromTick) + ppt(hop.bindings.ToTick);
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
  color: string;
}

interface Tick {
  place: Location;
  time: Time;
  term: Term;
  color: string;
}

// TODO: make these props
const DEFAULT_STEP = 7;
const X_OFFSET = 20;
const HOP_LINE_WIDTH = 1.5;
const LOC_LINE_WIDTH = 1;
const CIRCLE_RADIUS = 3;

function yForTime(maxTime: number, maxWidth: number, t: Time): number {
  const defaultValue = t * DEFAULT_STEP;
  const lerpValue = linearInterpolate([0, maxTime], [0, maxWidth], t);
  return Math.min(defaultValue, lerpValue);
}

function sequenceDiagram(
  seq: Sequence,
  highlight: Term,
  width: number
): Diag<Term> {
  const maxTime = seq.hops.reduce(
    (prev, hop) => Math.max(prev, hop.to.time, hop.from.time),
    0
  );

  const maxWidth = width - X_OFFSET - 60; // padding

  const locationLines: Diag<Term> = AbsPos(
    { x: X_OFFSET, y: 20 },
    VLayout(
      seq.locations.map((loc) =>
        HLayout([
          Tag(
            loc.term,
            // TODO: cursor: pointer
            Text({
              text: loc.loc,
              fontSize: 10,
              fontWeight: termEq(loc.term, highlight) ? "bold" : "normal",
            })
          ),
          ZLayout([
            Line({
              width: LOC_LINE_WIDTH,
              stroke: "black",
              start: ORIGIN,
              end: { y: 0, x: maxWidth },
            }),
            ...pointsForLocation(loc.loc, seq.hops).map((tp) => {
              const highlighted = jsonEq(tp.term, highlight);
              return AbsPos(
                { y: 0, x: yForTime(maxTime, maxWidth, tp.time) },
                Tag(
                  tp.term,
                  Circle({
                    radius: CIRCLE_RADIUS,
                    fill: highlighted ? TICK_HIGHLIGHT_COLOR : tp.color,
                  })
                )
              );
            }),
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
      const highlighted = jsonEq(hop.term, highlight);
      return Tag(
        hop.term,
        Line({
          stroke: highlighted ? HOP_HIGHLIGHT_COLOR : hop.color,
          width: HOP_LINE_WIDTH,
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
