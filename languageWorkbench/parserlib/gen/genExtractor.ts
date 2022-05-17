import { Grammar, Rule } from "../grammar";
import { Program, FunctionDeclaration } from "estree";
import { generate } from "astring";
import { flatMap, mapListToObj, mapObjToList, uniq } from "../../../util/util";
import { jsBlock, jsCall, jsIdent, jsObj, jsStr } from "./astHelpers";

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

function refsInRule(rule: Rule): string[] {
  switch (rule.type) {
    case "Char":
      return [];
    case "Choice":
      return flatMap(rule.choices, refsInRule);
    case "Ref":
      return [rule.name];
    case "RepSep":
      return [...refsInRule(rule.rep), ...refsInRule(rule.sep)];
    case "Sequence":
      return flatMap(rule.items, refsInRule);
    case "Text":
      return [];
  }
}

function genRule(name: string, rule: Rule): FunctionDeclaration {
  const refs = refsInRule(rule);
  // TODO: check for dups
  if (uniq(refs).length !== refs.length) {
    throw new Error(`refs in rule have to be unique. got ${refs}`);
  }
  // ....
  return {
    type: "FunctionDeclaration",
    id: jsIdent(`extract_${name}`),
    params: [jsIdent("node")],
    body: jsBlock([
      {
        type: "ReturnStatement",
        argument: jsObj(
          mapListToObj(
            refs.map((name) => ({
              key: name,
              value: jsCall(jsIdent("childByName"), [
                jsIdent("node"),
                jsStr(name),
              ]),
            }))
          )
        ),
      },
    ]),
  };
}
