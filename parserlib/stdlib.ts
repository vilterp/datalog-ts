import {
  text,
  choice,
  seq,
  repSep,
  char,
  range,
  Rule,
  succeed,
} from "./grammar";

export const alpha = choice([char(range("a", "z")), char(range("A", "Z"))]);

export const digit = char(range("0", "9"));

export const alphaNum = choice([alpha, digit]);

export const ident = seq([char(range("a", "z")), rep(alphaNum)]);

export const intLit = rep(digit);

export const signedIntLit = seq([opt(text("-")), intLit]);

export function opt(rule: Rule): Rule {
  return choice([rule, succeed]);
}

// TODO: more than just alpha num
// TODO: escaping
// regex: \"(\\.|[^"\\])*\"
export const stringLit = seq([text(`"`), rep(alphaNum), text(`"`)]);

export function rep(rule: Rule): Rule {
  // TODO: this is bad...
  return repSep(rule, succeed);
}
