import { Grammar, Rule } from "../grammar";
import { Program, FunctionDeclaration } from "estree";
import { generate } from "astring";
import { flatMap, mapListToObj, mapObjToList, uniq } from "../../../util/util";
import {
  jsArrowFunc,
  jsBlock,
  jsCall,
  jsChain,
  jsIdent,
  jsMember,
  jsObj,
  jsStr,
} from "./astHelpers";

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

type RefInfo = { name: string; repeated: boolean };

function refsInRule(rule: Rule): RefInfo[] {
  return refsInRuleInner(rule, false);
}

function refsInRuleInner(rule: Rule, repeated: boolean): RefInfo[] {
  switch (rule.type) {
    case "Char":
      return [];
    case "Choice":
      return flatMap(rule.choices, (choice) =>
        refsInRuleInner(choice, repeated)
      );
    case "Ref":
      return [{ name: rule.name, repeated }];
    case "RepSep":
      if (repeated) {
        throw new Error("can't have repSep inside repSep. define a sub rule");
      }
      return [
        ...refsInRuleInner(rule.rep, true),
        ...refsInRuleInner(rule.sep, true),
      ];
    case "Sequence":
      return flatMap(rule.items, (item) => refsInRuleInner(item, repeated));
    case "Text":
      return [];
  }
}

function genRule(name: string, rule: Rule): FunctionDeclaration {
  const refs = refsInRule(rule);
  // TODO: check for dups
  const refNames = refs.map((r) => r.name);
  if (uniq(refNames).length !== refNames.length) {
    throw new Error(
      `refs in rule have to be unique. got ${JSON.stringify(refNames)}`
    );
  }
  // ....
  return {
    type: "FunctionDeclaration",
    id: jsIdent(extractorName(name)),
    params: [jsIdent("input"), jsIdent("node")],
    body: jsBlock([
      {
        type: "ReturnStatement",
        argument: jsObj(
          mapListToObj([
            { key: "__rule__", value: jsStr(name) },
            {
              key: "__text__",
              value: jsCall(jsIdent("textForSpan"), [
                jsIdent("input"),
                jsChain(["node", "span"]),
              ]),
            },
            ...refs.map(({ name, repeated }) => ({
              // TODO: pluralize if this is a repSep
              key: name,
              value: repeated
                ? jsCall(
                    jsMember(
                      jsCall(jsIdent("childrenByName"), [
                        jsIdent("node"),
                        jsStr(name),
                      ]),
                      "map"
                    ),
                    [
                      jsArrowFunc(
                        ["child"],
                        jsCall(jsIdent(extractorName(name)), [
                          jsIdent("input"),
                          jsIdent("child"),
                        ])
                      ),
                    ]
                  )
                : jsCall(jsIdent(extractorName(name)), [
                    jsIdent("input"),
                    jsCall(jsIdent("childByName"), [
                      jsIdent("node"),
                      jsStr(name),
                    ]),
                  ]),
            })),
          ])
        ),
      },
    ]),
  };
}

function extractorName(ruleName: string) {
  // TODO: make camelCase
  return `extract_${ruleName}`;
}
