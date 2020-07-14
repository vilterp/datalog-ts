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

// supposed to be like regex syntax
export function charRuleToString(rule: SingleCharRule): string {
  switch (rule.type) {
    case "Range":
      return `[${rule.from}-${rule.to}]`;
    case "Not":
      return `^${charRuleToString(rule.rule)}`;
    case "Literal":
      return rule.value;
  }
}

// pos

export type Pos = {
  line: number;
  col: number;
  offset: number;
};

export function addOffset(pos: Pos, offset: number): Pos {
  return {
    ...pos,
    col: pos.col + offset,
    offset: pos.offset + offset,
  };
}

export function addLine(pos: Pos): Pos {
  return {
    line: pos.line + 1,
    col: 1,
    offset: pos.offset + 1,
  };
}

export function posMax(a: Pos, b: Pos): Pos {
  if (a.offset > b.offset) {
    return a;
  }
  return b;
}

// TODO: dedup all the Span definitions in this codebase, lol
export type Span = {
  from: number;
  to: number;
};
