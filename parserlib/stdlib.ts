import {
  text,
  choice,
  seq,
  repSep,
  charRule,
  range,
  Rule,
  succeed,
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

export function opt(rule: Rule): Rule {
  return choice([rule, succeed]);
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
  // TODO: this is bad...
  return repSep(rule, succeed);
}

export function rep1(rule: Rule): Rule {
  return seq([rule, rep(rule)]);
}
