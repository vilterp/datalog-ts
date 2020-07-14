import { Grammar, choice, ref, seq, text, repSep } from "../grammar";
import { signedIntLit, stringLit, rep } from "../stdlib";

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
  object: seq([text("{"), repSep(ref("keyValue"), ref("sep")), text("}")]),
  keyValue: seq([stringLit, text(":"), ref("value")]),
  // array
  array: seq([text("["), repSep(ref("value"), ref("sep")), text("]")]),
  // TODO: put whitespace back in
  sep: text(","),
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
