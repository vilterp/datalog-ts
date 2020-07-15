import { Grammar, choice, ref, seq, text, repSep } from "../grammar";
import { signedIntLit, stringLit, rep, optWhitespace } from "../stdlib";

export const jsonGrammar: Grammar = {
  value: choice([
    ref("object"),
    ref("array"),
    ref("number"),
    ref("stringLit"),
    ref("bool"),
    ref("null"),
  ]),
  // object
  object: seq([
    text("{"),
    optWhitespace,
    repSep(ref("keyValue"), ref("sep")),
    optWhitespace,
    text("}"),
  ]),
  keyValue: seq([ref("key"), text(":"), optWhitespace, ref("value")]),
  key: stringLit,
  // array
  array: seq([
    text("["),
    optWhitespace,
    repSep(ref("value"), ref("sep")),
    optWhitespace,
    text("]"),
  ]),
  // TODO: put whitespace back in
  sep: seq([text(","), optWhitespace]),
  // literals
  // TODO: parse floats
  bool: choice([text("true"), text("false")]),
  null: text("null"),
  // whitespace
  optWhitespace: rep(ref("whitespace")),
  whitespace: choice([text(" "), text("\n"), text("\t")]),
  number: signedIntLit,
  stringLit,
};
