import { Grammar, ref, seq, choice, text, repSep } from "./grammar";
import {
  rep1,
  ident,
  commaSpace,
  block,
  squareBrackets,
  parens,
  stringLit,
  spaceAround,
  whitespace,
} from "./stdlib";

// hardcoded grammar for parsing grammar rules
export const metaGrammar: Grammar = {
  grammar: repSep(ref("ruleDefn"), whitespace),
  ruleDefn: seq([ident, spaceAround(text(":-")), ref("rule"), text(".")]),
  rule: choice([ref("seq"), ref("choice"), ref("ref"), ref("text")]),
  seq: block(squareBrackets, repSep(ref("rule"), commaSpace)),
  choice: block(parens, repSep(ref("rule"), spaceAround(text("|")))),
  ref: ident,
  text: stringLit,
};
