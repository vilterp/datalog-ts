export type Grammar = { [name: string]: Rule };

// TODO: can we get rid of these and just use generated types?
export type Rule =
  | TextRule
  | CharRule
  | ChoiceRule
  | SequenceRule
  | RepSepRule
  | RefRule;

export type TextRule = { type: "Text"; value: string };
export type CharRule = { type: "Char"; rule: SingleCharRule };
export type ChoiceRule = { type: "Choice"; choices: Rule[] };
export type SequenceRule = { type: "Sequence"; items: Rule[] };
export type RepSepRule = { type: "RepSep"; rep: Rule; sep: Rule };
export type RefRule = { type: "Ref"; rule: string; captureName: string | null };

export type char = string; // lol

export type SingleCharRule =
  | { type: "Range"; from: char; to: char }
  | { type: "Not"; rule: SingleCharRule }
  | { type: "Literal"; value: char }
  | { type: "AnyChar" };

// TODO: dedup all the Span definitions in this codebase, lol
export type Span = {
  from: number;
  to: number;
};

export function spanLength(s: Span): number {
  return s.to - s.from;
}
