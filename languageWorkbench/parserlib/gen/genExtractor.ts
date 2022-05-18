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
  tsTypedParam,
  TypeDeclaration,
  TypedFunctionDeclaration,
} from "./astHelpers";

export type Options = {
  parserlibPath: string;
  typePrefix: string;
};

export function genExtractorStr(options: Options, grammar: Grammar) {
  const program = genExtractor(options, grammar);
  return prettyPrintProgramWithTypes(program);
}

export function genExtractor(
  options: Options,
  grammar: Grammar
): ProgramWithTypes {
  return {
    type: "ProgramWithTypes",
    imports: [
      jsImport(`${options.parserlibPath}/ruleTree`, [
        "textForSpan",
        "childByName",
        "childrenByName",
        "RuleTree",
      ]),
    ],
    types: mapObjToList(grammar, (name, rule) =>
      typeForRule(name, rule, options.typePrefix)
    ),
    declarations: [
      // TODO: const GRAMMAR = parserlib.parseGrammar("...")
      // TODO: export function parse(input: string) {
      //   const tree = parserlib.parse(GRAMMAR, input);
      //   const ruleTree = parserlib.extractRuleTree(tree);
      //   return extract_main(input, ruleTree);
      // }
      ...mapObjToList(grammar, (name, rule) =>
        genRule(name, rule, options.typePrefix)
      ),
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

function genRule(
  ruleName: string,
  rule: Rule,
  prefix: string
): TypedFunctionDeclaration {
  const refs = refsInRule(rule);
  const refNames = refs.map((r) => `${r.captureName}:${r.ruleName}`);
  const grouped = groupBy(refNames, (x) => x);
  const counted = mapObj(grouped, (name, refs) => refs.length);
  const duplicated = filterObj(counted, (name, count) => count > 1);
  if (Object.keys(duplicated).length > 0) {
    // TODO: mostly triggered by whitespace rules...
    console.warn(
      `multiple refs from rule "${ruleName}": ${JSON.stringify(duplicated)}`
    );
  }
  return {
    type: "TypedFunctionDeclaration",
    name: extractorName(ruleName),
    returnType: tsType(typeName(ruleName, prefix)),
    params: [
      tsTypedParam("input", tsType("string")),
      tsTypedParam("node", tsType("RuleTree")),
    ],
    body: jsBlock([
      {
        type: "ReturnStatement",
        argument: jsObj(
          mapListToObj([
            { key: "__rule__", value: jsStr(ruleName) },
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

function typeForRule(
  name: string,
  rule: Rule,
  prefix: string
): TypeDeclaration {
  const refs = refsInRule(rule);
  return {
    type: "TypeDeclaration",
    name: typeName(name, prefix),
    exported: true,
    members: refs.map((ref) => {
      const inner = tsType(typeName(ref.ruleName, prefix));
      return {
        name: ref.captureName ? ref.captureName : ref.ruleName,
        type: ref.repeated ? tsArrayType(inner) : inner,
      };
    }),
  };
}

function typeName(ruleName: string, prefix: string) {
  return `${prefix}${capitalize(ruleName)}`;
}

function extractorName(ruleName: string) {
  // TODO: make camelCase
  return `extract${capitalize(ruleName)}`;
}
