import { prettyPrintParseError } from "./pretty";

export type Grammar = { [name: string]: Rule };

// === Rules ===

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

export function text(str: string): TextRule {
  return { type: "Text", value: str };
}

export function charRule(rule: SingleCharRule): Rule {
  return { type: "Char", rule };
}

export function choice(choices: Rule[]): Rule {
  return { type: "Choice", choices };
}

export function seq(items: Rule[]): Rule {
  return { type: "Sequence", items };
}

export function repSep(rep: Rule, sep: Rule): Rule {
  return { type: "RepSep", rep, sep };
}

export function ref(rule: string, captureName: string | null = null): Rule {
  return { type: "Ref", rule, captureName };
}

// === Char Rules ===

export type char = string; // lol

export type SingleCharRule =
  | { type: "Range"; from: char; to: char }
  | { type: "Not"; rule: SingleCharRule }
  | { type: "Literal"; value: char }
  | { type: "AnyChar" };

export function range(from: char, to: char): SingleCharRule {
  return { type: "Range", from, to };
}

export function notChar(rule: SingleCharRule): SingleCharRule {
  return { type: "Not", rule };
}

export function literalChar(value: char): SingleCharRule {
  return { type: "Literal", value };
}

export const anyChar: SingleCharRule = { type: "AnyChar" };

// === Spans ===

// TODO: dedup all the Span definitions in this codebase, lol
export type Span = {
  from: number;
  to: number;
};

export function spanLength(s: Span): number {
  return s.to - s.from;
}

// TODO: find a better home for this
export function deEscape(str: string): string {
  return str.replace(/\\n/, "\n").replace(/\\\\/, "\\").replace(/\\"/, '"');
}

// === Errors ===

export type ParseError = {
  offset: number;
  expected: Rule | "end of file";
  got: string;
};

export class ParseErrors extends Error {
  constructor(public errors: ParseError[]) {
    super(`ParseErrors: ${errors.map(prettyPrintParseError).join("\n")}`);
  }
}
