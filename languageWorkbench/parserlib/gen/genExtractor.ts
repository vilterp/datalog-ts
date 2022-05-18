import { Grammar, Rule } from "../grammar";
import { Program, FunctionDeclaration } from "estree";
import { generate } from "astring";
import {
  capitalize,
  filterObj,
  flatMap,
  groupBy,
  mapListToObj,
  mapObj,
  mapObjToList,
  uniq,
} from "../../../util/util";
import {
  jsArrowFunc,
  jsBlock,
  jsCall,
  jsChain,
  jsIdent,
  jsImport,
  jsMember,
  jsObj,
  jsStr,
  prettyPrintProgramWithTypes,
  ProgramWithTypes,
  tsArrayType,
  tsType,
  TypeDeclaration,
} from "./astHelpers";

export function genExtractorStr(parserlibPath: string, grammar: Grammar) {
  const program = genExtractor(parserlibPath, grammar);
  return prettyPrintProgramWithTypes(program);
}

export function genExtractor(
  parserlibPath: string,
  grammar: Grammar
): ProgramWithTypes {
  return {
    type: "ProgramWithTypes",
    imports: [
      jsImport(`${parserlibPath}/ruleTree`, [
        "textForSpan",
        "childByName",
        "childrenByName",
      ]),
    ],
    types: mapObjToList(grammar, typeForRule),
    declarations: [
      // TODO: const GRAMMAR = parserlib.parseGrammar("...")
      // TODO: export function parse(input: string) {
      //   const tree = parserlib.parse(GRAMMAR, input);
      //   const ruleTree = parserlib.extractRuleTree(tree);
      //   return extract_main(input, ruleTree);
      // }
      ...mapObjToList(grammar, genRule),
    ],
  };
}

type RefInfo = {
  ruleName: string;
  captureName: string | null;
  repeated: boolean;
};

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
      return [{ ruleName: rule.rule, captureName: rule.captureName, repeated }];
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
  const refNames = refs.map((r) => `${r.captureName}:${r.ruleName}`);
  const grouped = groupBy(refNames, (x) => x);
  const counted = mapObj(grouped, (name, refs) => refs.length);
  const duplicated = filterObj(counted, (name, count) => count > 1);
  if (Object.keys(duplicated).length > 0) {
    // TODO: mostly triggered by whitespace rules...
    console.warn(
      `multiple refs from rule "${name}": ${JSON.stringify(duplicated)}`
    );
  }
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
            ...refs.map(({ ruleName, repeated, captureName }) => ({
              // TODO: pluralize if this is a repSep
              key: captureName ? captureName : ruleName,
              value: repeated
                ? jsCall(
                    jsMember(
                      jsCall(jsIdent("childrenByName"), [
                        jsIdent("node"),
                        jsStr(ruleName),
                      ]),
                      "map"
                    ),
                    [
                      jsArrowFunc(
                        ["child"],
                        jsCall(jsIdent(extractorName(ruleName)), [
                          jsIdent("input"),
                          jsIdent("child"),
                        ])
                      ),
                    ]
                  )
                : jsCall(jsIdent(extractorName(ruleName)), [
                    jsIdent("input"),
                    jsCall(jsIdent("childByName"), [
                      jsIdent("node"),
                      jsStr(ruleName),
                    ]),
                  ]),
            })),
          ])
        ),
      },
    ]),
  };
}

function typeForRule(name: string, rule: Rule): TypeDeclaration {
  const refs = refsInRule(rule);
  return {
    type: "TypeDeclaration",
    name: capitalize(name),
    members: refs.map((ref) => {
      const inner = tsType(capitalize(ref.ruleName));
      return { name, type: ref.repeated ? tsArrayType(inner) : inner };
    }),
  };
}

function extractorName(ruleName: string) {
  // TODO: make camelCase
  return `extract${capitalize(ruleName)}`;
}
