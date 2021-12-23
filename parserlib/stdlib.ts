import {
  text,
  choice,
  seq,
  repSep,
  charRule,
  range,
  Rule,
  notChar,
  literalChar,
} from "./grammar";

export const alpha = choice([
  charRule(range("a", "z")),
  charRule(range("A", "Z")),
]);

export const digit = charRule(range("0", "9"));

export const alphaNum = choice([alpha, digit]);

export const ident = seq([charRule(range("a", "z")), rep(alphaNum)]);

export const intLit = rep1(digit);

export const signedIntLit = seq([opt(text("-")), intLit]);

export const whitespaceChar = choice([
  charRule(literalChar(" ")),
  charRule(literalChar("\t")),
  charRule(literalChar("\n")),
]);

// whitespace

export const whitespace = rep1(whitespaceChar);

export const optWhitespace = rep(whitespaceChar);

export const commaSpace = spaceAround(text(","));

export function spaceAround(rule: Rule): Rule {
  return seq([optWhitespace, rule, optWhitespace]);
}

export function opt(rule: Rule): Rule {
  return choice([rule, text("")]);
}

// TODO: this is pretty cumbersome compared to writing a regex
export const stringLit = seq([
  text(`"`),
  rep(
    choice([
      charRule(notChar(literalChar(`"`))),
      seq([charRule(literalChar(`\\`)), charRule(literalChar(`"`))]),
    ])
  ),
  text(`"`),
]);

export function rep(rule: Rule): Rule {
  return repSep(rule, text(""));
}

export function rep1(rule: Rule): Rule {
  return seq([rule, rep(rule)]);
}

export function block([left, right]: [string, string], inner: Rule): Rule {
  return seq([text(left), optWhitespace, inner, optWhitespace, text(right)]);
}

// enclosers

export const squareBrackets: [string, string] = ["[", "]"];

export const parens: [string, string] = ["(", ")"];
