export type Diag<T> =
  | AbsPos<T>
  // groups
  | HorizLayout<T>
  | VertLayout<T>
  | ZLayout<T>
  // | FlexLayout<T> // could replace Horiz & Vert
  // primitives
  | Line
  | Circle
  | Spacer
  | Text
  | Tag<T>;

export interface Point {
  x: number;
  y: number;
}

interface AbsPos<T> {
  type: "ABS_POS";
  point: Point;
  diag: Diag<T>;
}

export function AbsPos<T>(point: Point, diag: Diag<T>): Diag<T> {
  return {
    type: "ABS_POS",
    point,
    diag,
  };
}

// Line

interface Line extends LineProps {
  type: "LINE";
}

interface LineProps {
  width: number;
  stroke: string;
  // starts at diagram's (0, 0); goes here
  start: Point;
  end: Point;
}

export function Line<T>(p: LineProps): Diag<T> {
  return {
    type: "LINE",
    ...p,
  };
}

// Circle

interface Circle extends CircleProps {
  type: "CIRCLE";
}

interface CircleProps {
  radius: number;
  fill: string;
}

export function Circle<T>(p: CircleProps): Diag<T> {
  return {
    type: "CIRCLE",
    ...p,
  };
}

// Text

interface Text extends TextProps {
  type: "TEXT";
}

interface TextProps {
  text: string;
  fontSize: number;
}

export function Text(p: TextProps): Diag<any> {
  return {
    type: "TEXT",
    ...p,
  };
}

// Spacer

interface Spacer extends SpacerProps {
  type: "SPACER";
}

interface SpacerProps {
  width: number;
  height: number;
}

export function HSpace(width: number): Diag<any> {
  return {
    type: "SPACER",
    width,
    height: 0,
  };
}

export function VSpace(height: number): Diag<any> {
  return {
    type: "SPACER",
    height,
    width: 0,
  };
}

export const EMPTY_DIAGRAM: Diag<any> = { type: "SPACER", width: 0, height: 0 };

export const ORIGIN: Point = { x: 0, y: 0 };

// Horizontal layout

interface HorizLayout<T> {
  type: "HORIZ_LAYOUT";
  children: Diag<T>[];
}

export function HLayout<T>(children: Diag<T>[]): Diag<T> {
  return {
    type: "HORIZ_LAYOUT",
    children,
  };
}

// Vertical layout

interface VertLayout<T> {
  type: "VERT_LAYOUT";
  children: Diag<T>[];
  // TODO: alignment
}

export function VLayout<T>(children: Diag<T>[]): Diag<T> {
  return {
    type: "VERT_LAYOUT",
    children,
  };
}

// ZLayout

interface ZLayout<T> {
  type: "Z_LAYOUT";
  children: Diag<T>[];
}

export function ZLayout<T>(children: Diag<T>[]): Diag<T> {
  return {
    type: "Z_LAYOUT",
    children,
  };
}

// Tag

interface Tag<T> {
  type: "TAG";
  tag: T;
  diag: Diag<T>;
}

export function Tag<T>(tag: T, diag: Diag<T>): Diag<T> {
  return {
    type: "TAG",
    tag,
    diag,
  };
}
