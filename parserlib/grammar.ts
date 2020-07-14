export type Rule =
  | TextRule
  | CharRule
  | ChoiceRule
  | SequenceRule
  | RepSepRule
  | RefRule
  | SucceedRule;

export type TextRule = { type: "Text"; value: string };
export type CharRule = { type: "Char"; rule: SingleCharRule };
export type ChoiceRule = { type: "Choice"; choices: Rule[] };
export type SequenceRule = { type: "Sequence"; items: Rule[] };
export type RepSepRule = { type: "RepSep"; rep: Rule; sep: Rule };
export type RefRule = { type: "Ref"; name: string };
export type SucceedRule = { type: "Succeed" };

export function text(value: string): Rule {
  return { type: "Text", value };
}

export function char(rule: SingleCharRule): Rule {
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

export function ref(name: string): Rule {
  return { type: "Ref", name };
}

export const succeed: Rule = { type: "Succeed" };

export type Grammar = { [name: string]: Rule };

// char rules

export type char = string; // lol

export type SingleCharRule =
  | { type: "Range"; from: char; to: char }
  | { type: "Not"; rule: SingleCharRule }
  | { type: "Literal"; value: char };

export function range(from: char, to: char): SingleCharRule {
  return { type: "Range", from, to };
}

// TODO: dedup all the Span definitions in this codebase, lol
export type Span = {
  from: number;
  to: number;
};

export function spanLength(s: Span): number {
  return s.to - s.from;
}
