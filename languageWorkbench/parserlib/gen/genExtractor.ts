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
  tsTypeName,
  tsTypedParam,
  TypeDeclaration,
  TypedFunctionDeclaration,
  tsTypeString,
} from "./astHelpers";
import { OpenRelationsContainer } from "../../../uiCommon/explorer/openRelationsContainer";

export type Options = {
  parserlibPath: string;
  typePrefix: string;
  ignoreRules: Set<string>;
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
      typeForRule(name, rule, options)
    ),
    declarations: [
      // TODO: const GRAMMAR = parserlib.parseGrammar("...")
      // TODO: export function parse(input: string) {
      //   const tree = parserlib.parse(GRAMMAR, input);
      //   const ruleTree = parserlib.extractRuleTree(tree);
      //   return extract_main(input, ruleTree);
      // }
      ...mapObjToList(
        filterObj(grammar, (name) => !options.ignoreRules.has(name)),
        (name, rule) => genRule(name, rule, options)
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
  options: Options
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
    returnType: tsTypeName(typeName(ruleName, options.typePrefix)),
    params: [
      tsTypedParam("input", tsTypeName("string")),
      tsTypedParam("node", tsTypeName("RuleTree")),
    ],
    body: jsBlock([
      {
        type: "ReturnStatement",
        argument: jsObj(
          mapListToObj([
            { key: "type", value: jsStr(capitalize(ruleName)) },
            {
              key: "text",
              value: jsCall(jsIdent("textForSpan"), [
                jsIdent("input"),
                jsChain(["node", "span"]),
              ]),
            },
            ...refs
              .filter((ref) => !options.ignoreRules.has(ref.ruleName))
              .map(({ ruleName, repeated, captureName }) => ({
                // TODO: pluralize if this is a repSep
                key: prefixToAvoidReserved(
                  captureName ? captureName : ruleName
                ),
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
  ruleName: string,
  rule: Rule,
  options: Options
): TypeDeclaration {
  const refs = refsInRule(rule);
  return {
    type: "TypeDeclaration",
    name: typeName(ruleName, options.typePrefix),
    exported: true,
    members: [
      { name: "type", type: tsTypeString(capitalize(ruleName)) },
      { name: "text", type: tsTypeName("string") },
      ...refs
        .filter((ref) => !options.ignoreRules.has(ref.ruleName))
        .map((ref) => {
          const inner = tsTypeName(typeName(ref.ruleName, options.typePrefix));
          return {
            name: prefixToAvoidReserved(
              ref.captureName ? ref.captureName : ref.ruleName
            ),
            type: ref.repeated ? tsArrayType(inner) : inner,
          };
        }),
    ],
  };
}

function typeName(ruleName: string, prefix: string) {
  return `${prefix}${capitalize(ruleName)}`;
}

function extractorName(ruleName: string) {
  // TODO: make camelCase
  return `extract${capitalize(ruleName)}`;
}

const RESERVED = new Set(["type", "text", "span"]);

function prefixToAvoidReserved(name: string): string {
  if (RESERVED.has(name)) {
    return `_${name}`;
  }
  return name;
}
