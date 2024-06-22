import React, { useMemo } from "react";
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
    const spec = useMemo(() => getSpec(props), [props]);

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

function getSpec(props: VizArgs): SequenceSpec {
  const actors = props.interp.queryRec(props.spec.attrs.actors as Rec);
  const hops = props.interp.queryRec(props.spec.attrs.hops as Rec);
  const ticks = props.interp.queryRec(props.spec.attrs.ticks as Rec);
  const tickColors = props.spec.attrs.tickColor
    ? props.interp.queryRec(props.spec.attrs.tickColor as Rec)
    : [];
  const hopColors = props.spec.attrs.hopColor
    ? props.interp.queryRec(props.spec.attrs.hopColor as Rec)
    : [];

  return makeSequenceSpec(actors, ticks, hops, tickColors, hopColors);
}

const DEFAULT_TICK_COLOR = "lightblue";
const DEFAULT_HOP_COLOR = "blue";

const HOP_HIGHLIGHT_COLOR = "orange";
const TICK_HIGHLIGHT_COLOR = "orange";

// TODO: maybe integrate this into one of the above functions??
//   or not
function makeSequenceSpec(
  actors: Res[],
  ticks: Res[],
  hops: Res[],
  tickColors: Res[],
  hopColors: Res[]
): SequenceSpec {
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
    ticks: ticks.map((tick) => {
      return {
        time: (tick.bindings.Time as Int).val,
        place: (tick.bindings.Place as StringLit).val,
        term: tick.term,
        color: colorByTick[ppt(tick.term)] || DEFAULT_TICK_COLOR,
      };
    }),
    hops: hops.map((hop) => {
      const fromTickRec = hop.bindings.FromTick as Rec;
      const fromTick: Coord = {
        time: (fromTickRec.attrs.time as Int).val,
        place: (fromTickRec.attrs.place as StringLit).val,
        tickTerm: fromTickRec,
      };
      const toTickRec = hop.bindings.ToTick as Rec;
      const toTick: Coord = {
        time: (toTickRec.attrs.time as Int).val,
        place: (toTickRec.attrs.place as StringLit).val,
        tickTerm: toTickRec,
      };
      const outHop: Hop = {
        term: hop.term,
        from: fromTick,
        to: toTick,
        color: colorByHop[pptHop(hop)] || DEFAULT_HOP_COLOR,
      };
      return outHop;
    }),
  };
}

function pptHop(hop: Res): string {
  return ppt(hop.bindings.FromTick) + ppt(hop.bindings.ToTick);
}

export type Location = string;
export type Time = number;

export interface SequenceSpec {
  locations: { loc: Location; term: Term }[];
  ticks: Tick[];
  hops: Hop[];
}

type Coord = {
  time: Time;
  place: Location;
  tickTerm: Term;
};

export interface Hop {
  from: Coord;
  to: Coord;
  term: Term;
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
  seq: SequenceSpec,
  highlight: Term,
  width: number
): Diag<Term> {
  const maxTime = seq.ticks.reduce(
    (prev, tick) => Math.max(prev, tick.time),
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
            ...pointsForLocation(loc.loc, seq.ticks).map((tp) => {
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
      const fromCoords = getCoords(locationLines, hop.from.tickTerm);
      const toCoords = getCoords(locationLines, hop.to.tickTerm);
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

// TODO: change to some sort of group by
function pointsForLocation(loc: Location, ticks: Tick[]): Tick[] {
  return flatMap(ticks, (tick) => {
    const out: Tick[] = [];
    if (tick.place === loc) {
      out.push(tick);
    }
    if (tick.place === loc) {
      out.push(tick);
    }
    return out;
  });
}
