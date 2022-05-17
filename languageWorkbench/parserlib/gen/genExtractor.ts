import { Grammar } from "../grammar";
import { Program } from "estree";
import { generate } from "astring";

export function genExtractorStr(grammar: Grammar) {
  const program = genExtractor(grammar);
  return generate(program);
}

export function genExtractor(grammar: Grammar): Program {
  return {
    type: "Program",
    sourceType: "script",
    body: [],
  };
}
