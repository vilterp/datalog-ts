import { Grammar, Rule } from "../grammar";
import { Program, FunctionDeclaration } from "estree";
import { generate } from "astring";
import { mapObjToList } from "../../../util/util";
import { jsBlock, jsIdent } from "./astHelpers";

export function genExtractorStr(grammar: Grammar) {
  const program = genExtractor(grammar);
  return generate(program);
}

export function genExtractor(grammar: Grammar): Program {
  return {
    type: "Program",
    sourceType: "script",
    body: mapObjToList(grammar, genRule),
  };
}

function genRule(name: string, body: Rule): FunctionDeclaration {
  return {
    type: "FunctionDeclaration",
    id: jsIdent(`extract_${name}`),
    params: [],
    body: jsBlock([]),
  };
}
