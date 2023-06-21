// generated by parserlib; do not edit.
import {
  textForSpan,
  childByName,
  childrenByName,
  RuleTree,
  extractRuleTree,
} from "../../parserlib/ruleTree";
import { Span, Grammar } from "../../parserlib/types";
import * as parserlib from "../../parserlib/parser";
export type BBPlaceholder = {
  type: "Placeholder";
  text: string;
  span: Span;
};
export type BBAlpha = {
  type: "Alpha";
  text: string;
  span: Span;
};
export type BBAlphaNum = BBAlpha | BBNum;
export type BBBlock = {
  type: "Block";
  text: string;
  span: Span;
  label: BBLabel;
  blockBody: BBBlockBody;
};
export type BBBlockBody = {
  type: "BlockBody";
  text: string;
  span: Span;
  instr: BBInstr[];
};
export type BBCall = {
  type: "Call";
  text: string;
  span: Span;
  ident: BBIdent;
  params: BBParams | null;
};
export type BBComment = {
  type: "Comment";
  text: string;
  span: Span;
  commentChar: BBCommentChar[];
};
export type BBCommentChar = {
  type: "CommentChar";
  text: string;
  span: Span;
};
export type BBConst = BBString | BBInt;
export type BBForkToInstr = {
  type: "ForkToInstr";
  text: string;
  span: Span;
  forkToKW: BBForkToKW;
  label: BBLabel;
};
export type BBForkToKW = {
  type: "ForkToKW";
  text: string;
  span: Span;
};
export type BBGotoInstr = {
  type: "GotoInstr";
  text: string;
  span: Span;
  gotoKW: BBGotoKW;
  label: BBLabel | null;
  Placeholder: BBPlaceholder | null;
  ifClause: BBIfClause | null;
};
export type BBGotoKW = {
  type: "GotoKW";
  text: string;
  span: Span;
};
export type BBIdent = {
  type: "Ident";
  text: string;
  span: Span;
  alpha: BBAlpha;
  alphaNum: BBAlphaNum[];
};
export type BBIfClause = {
  type: "IfClause";
  text: string;
  span: Span;
  ifKW: BBIfKW;
  ident: BBIdent;
};
export type BBIfKW = {
  type: "IfKW";
  text: string;
  span: Span;
};
export type BBInstr = BBValueInstr | BBGotoInstr | BBForkToInstr;
export type BBInt = {
  type: "Int";
  text: string;
  span: Span;
};
export type BBLabel = {
  type: "Label";
  text: string;
  span: Span;
  ident: BBIdent;
};
export type BBMain = {
  type: "Main";
  text: string;
  span: Span;
  block: BBBlock[];
};
export type BBNum = {
  type: "Num";
  text: string;
  span: Span;
};
export type BBParams = {
  type: "Params";
  text: string;
  span: Span;
  ident: BBIdent[];
  Placeholder: BBPlaceholder[];
};
export type BBRvalue = BBCall | BBConst;
export type BBSpaces = {
  type: "Spaces";
  text: string;
  span: Span;
};
export type BBString = {
  type: "String";
  text: string;
  span: Span;
  stringChar: BBStringChar[];
};
export type BBStringChar = {
  type: "StringChar";
  text: string;
  span: Span;
};
export type BBValueInstr = {
  type: "ValueInstr";
  text: string;
  span: Span;
  ident: BBIdent | null;
  rvalue: BBRvalue;
};
export type BBWs = {
  type: "Ws";
  text: string;
  span: Span;
  spaces: BBSpaces[];
  comment: BBComment[];
};
export function parsePlaceholder(input: string): BBPlaceholder {
  const traceTree = parserlib.parse(GRAMMAR, "Placeholder", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractPlaceholder(input, ruleTree);
}
export function parseAlpha(input: string): BBAlpha {
  const traceTree = parserlib.parse(GRAMMAR, "alpha", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractAlpha(input, ruleTree);
}
export function parseAlphaNum(input: string): BBAlphaNum {
  const traceTree = parserlib.parse(GRAMMAR, "alphaNum", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractAlphaNum(input, ruleTree);
}
export function parseBlock(input: string): BBBlock {
  const traceTree = parserlib.parse(GRAMMAR, "block", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractBlock(input, ruleTree);
}
export function parseBlockBody(input: string): BBBlockBody {
  const traceTree = parserlib.parse(GRAMMAR, "blockBody", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractBlockBody(input, ruleTree);
}
export function parseCall(input: string): BBCall {
  const traceTree = parserlib.parse(GRAMMAR, "call", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractCall(input, ruleTree);
}
export function parseComment(input: string): BBComment {
  const traceTree = parserlib.parse(GRAMMAR, "comment", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractComment(input, ruleTree);
}
export function parseCommentChar(input: string): BBCommentChar {
  const traceTree = parserlib.parse(GRAMMAR, "commentChar", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractCommentChar(input, ruleTree);
}
export function parseConst(input: string): BBConst {
  const traceTree = parserlib.parse(GRAMMAR, "const", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractConst(input, ruleTree);
}
export function parseForkToInstr(input: string): BBForkToInstr {
  const traceTree = parserlib.parse(GRAMMAR, "forkToInstr", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractForkToInstr(input, ruleTree);
}
export function parseForkToKW(input: string): BBForkToKW {
  const traceTree = parserlib.parse(GRAMMAR, "forkToKW", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractForkToKW(input, ruleTree);
}
export function parseGotoInstr(input: string): BBGotoInstr {
  const traceTree = parserlib.parse(GRAMMAR, "gotoInstr", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractGotoInstr(input, ruleTree);
}
export function parseGotoKW(input: string): BBGotoKW {
  const traceTree = parserlib.parse(GRAMMAR, "gotoKW", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractGotoKW(input, ruleTree);
}
export function parseIdent(input: string): BBIdent {
  const traceTree = parserlib.parse(GRAMMAR, "ident", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractIdent(input, ruleTree);
}
export function parseIfClause(input: string): BBIfClause {
  const traceTree = parserlib.parse(GRAMMAR, "ifClause", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractIfClause(input, ruleTree);
}
export function parseIfKW(input: string): BBIfKW {
  const traceTree = parserlib.parse(GRAMMAR, "ifKW", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractIfKW(input, ruleTree);
}
export function parseInstr(input: string): BBInstr {
  const traceTree = parserlib.parse(GRAMMAR, "instr", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractInstr(input, ruleTree);
}
export function parseInt(input: string): BBInt {
  const traceTree = parserlib.parse(GRAMMAR, "int", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractInt(input, ruleTree);
}
export function parseLabel(input: string): BBLabel {
  const traceTree = parserlib.parse(GRAMMAR, "label", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractLabel(input, ruleTree);
}
export function parseMain(input: string): BBMain {
  const traceTree = parserlib.parse(GRAMMAR, "main", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractMain(input, ruleTree);
}
export function parseNum(input: string): BBNum {
  const traceTree = parserlib.parse(GRAMMAR, "num", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractNum(input, ruleTree);
}
export function parseParams(input: string): BBParams {
  const traceTree = parserlib.parse(GRAMMAR, "params", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractParams(input, ruleTree);
}
export function parseRvalue(input: string): BBRvalue {
  const traceTree = parserlib.parse(GRAMMAR, "rvalue", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractRvalue(input, ruleTree);
}
export function parseSpaces(input: string): BBSpaces {
  const traceTree = parserlib.parse(GRAMMAR, "spaces", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractSpaces(input, ruleTree);
}
export function parseString(input: string): BBString {
  const traceTree = parserlib.parse(GRAMMAR, "string", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractString(input, ruleTree);
}
export function parseStringChar(input: string): BBStringChar {
  const traceTree = parserlib.parse(GRAMMAR, "stringChar", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractStringChar(input, ruleTree);
}
export function parseValueInstr(input: string): BBValueInstr {
  const traceTree = parserlib.parse(GRAMMAR, "valueInstr", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractValueInstr(input, ruleTree);
}
function extractPlaceholder(input: string, node: RuleTree): BBPlaceholder {
  return {
    type: "Placeholder",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractAlpha(input: string, node: RuleTree): BBAlpha {
  return {
    type: "Alpha",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractAlphaNum(input: string, node: RuleTree): BBAlphaNum {
  const child = node.children[0];
  switch (child.name) {
    case "alpha": {
      return extractAlpha(input, child);
    }
    case "num": {
      return extractNum(input, child);
    }
  }
}
function extractBlock(input: string, node: RuleTree): BBBlock {
  return {
    type: "Block",
    text: textForSpan(input, node.span),
    span: node.span,
    label: extractLabel(input, childByName(node, "label", null)),
    blockBody: extractBlockBody(input, childByName(node, "blockBody", null)),
  };
}
function extractBlockBody(input: string, node: RuleTree): BBBlockBody {
  return {
    type: "BlockBody",
    text: textForSpan(input, node.span),
    span: node.span,
    instr: childrenByName(node, "instr").map((child) =>
      extractInstr(input, child)
    ),
  };
}
function extractCall(input: string, node: RuleTree): BBCall {
  return {
    type: "Call",
    text: textForSpan(input, node.span),
    span: node.span,
    ident: extractIdent(input, childByName(node, "ident", null)),
    params: childByName(node, "params", null)
      ? extractParams(input, childByName(node, "params", null))
      : null,
  };
}
function extractComment(input: string, node: RuleTree): BBComment {
  return {
    type: "Comment",
    text: textForSpan(input, node.span),
    span: node.span,
    commentChar: childrenByName(node, "commentChar").map((child) =>
      extractCommentChar(input, child)
    ),
  };
}
function extractCommentChar(input: string, node: RuleTree): BBCommentChar {
  return {
    type: "CommentChar",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractConst(input: string, node: RuleTree): BBConst {
  const child = node.children[0];
  switch (child.name) {
    case "string": {
      return extractString(input, child);
    }
    case "int": {
      return extractInt(input, child);
    }
  }
}
function extractForkToInstr(input: string, node: RuleTree): BBForkToInstr {
  return {
    type: "ForkToInstr",
    text: textForSpan(input, node.span),
    span: node.span,
    forkToKW: extractForkToKW(input, childByName(node, "forkToKW", null)),
    label: extractLabel(input, childByName(node, "label", null)),
  };
}
function extractForkToKW(input: string, node: RuleTree): BBForkToKW {
  return {
    type: "ForkToKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractGotoInstr(input: string, node: RuleTree): BBGotoInstr {
  return {
    type: "GotoInstr",
    text: textForSpan(input, node.span),
    span: node.span,
    gotoKW: extractGotoKW(input, childByName(node, "gotoKW", null)),
    label: childByName(node, "label", null)
      ? extractLabel(input, childByName(node, "label", null))
      : null,
    Placeholder: childByName(node, "Placeholder", null)
      ? extractPlaceholder(input, childByName(node, "Placeholder", null))
      : null,
    ifClause: childByName(node, "ifClause", null)
      ? extractIfClause(input, childByName(node, "ifClause", null))
      : null,
  };
}
function extractGotoKW(input: string, node: RuleTree): BBGotoKW {
  return {
    type: "GotoKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractIdent(input: string, node: RuleTree): BBIdent {
  return {
    type: "Ident",
    text: textForSpan(input, node.span),
    span: node.span,
    alpha: extractAlpha(input, childByName(node, "alpha", null)),
    alphaNum: childrenByName(node, "alphaNum").map((child) =>
      extractAlphaNum(input, child)
    ),
  };
}
function extractIfClause(input: string, node: RuleTree): BBIfClause {
  return {
    type: "IfClause",
    text: textForSpan(input, node.span),
    span: node.span,
    ifKW: extractIfKW(input, childByName(node, "ifKW", null)),
    ident: extractIdent(input, childByName(node, "ident", null)),
  };
}
function extractIfKW(input: string, node: RuleTree): BBIfKW {
  return {
    type: "IfKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractInstr(input: string, node: RuleTree): BBInstr {
  const child = node.children[0];
  switch (child.name) {
    case "valueInstr": {
      return extractValueInstr(input, child);
    }
    case "gotoInstr": {
      return extractGotoInstr(input, child);
    }
    case "forkToInstr": {
      return extractForkToInstr(input, child);
    }
  }
}
function extractInt(input: string, node: RuleTree): BBInt {
  return {
    type: "Int",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractLabel(input: string, node: RuleTree): BBLabel {
  return {
    type: "Label",
    text: textForSpan(input, node.span),
    span: node.span,
    ident: extractIdent(input, childByName(node, "ident", null)),
  };
}
function extractMain(input: string, node: RuleTree): BBMain {
  return {
    type: "Main",
    text: textForSpan(input, node.span),
    span: node.span,
    block: childrenByName(node, "block").map((child) =>
      extractBlock(input, child)
    ),
  };
}
function extractNum(input: string, node: RuleTree): BBNum {
  return {
    type: "Num",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractParams(input: string, node: RuleTree): BBParams {
  return {
    type: "Params",
    text: textForSpan(input, node.span),
    span: node.span,
    ident: childrenByName(node, "ident").map((child) =>
      extractIdent(input, child)
    ),
    Placeholder: childrenByName(node, "Placeholder").map((child) =>
      extractPlaceholder(input, child)
    ),
  };
}
function extractRvalue(input: string, node: RuleTree): BBRvalue {
  const child = node.children[0];
  switch (child.name) {
    case "call": {
      return extractCall(input, child);
    }
    case "const": {
      return extractConst(input, child);
    }
  }
}
function extractSpaces(input: string, node: RuleTree): BBSpaces {
  return {
    type: "Spaces",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractString(input: string, node: RuleTree): BBString {
  return {
    type: "String",
    text: textForSpan(input, node.span),
    span: node.span,
    stringChar: childrenByName(node, "stringChar").map((child) =>
      extractStringChar(input, child)
    ),
  };
}
function extractStringChar(input: string, node: RuleTree): BBStringChar {
  return {
    type: "StringChar",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractValueInstr(input: string, node: RuleTree): BBValueInstr {
  return {
    type: "ValueInstr",
    text: textForSpan(input, node.span),
    span: node.span,
    ident: childByName(node, "ident", null)
      ? extractIdent(input, childByName(node, "ident", null))
      : null,
    rvalue: extractRvalue(input, childByName(node, "rvalue", null)),
  };
}
const GRAMMAR: Grammar = {
  main: {
    type: "RepSep",
    rep: {
      type: "Ref",
      captureName: null,
      rule: "block",
    },
    sep: {
      type: "Ref",
      captureName: null,
      rule: "ws",
    },
  },
  block: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        captureName: null,
        rule: "label",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "ws",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "blockBody",
      },
    ],
  },
  blockBody: {
    type: "Sequence",
    items: [
      {
        type: "Text",
        value: "{",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "ws",
      },
      {
        type: "RepSep",
        rep: {
          type: "Ref",
          captureName: null,
          rule: "instr",
        },
        sep: {
          type: "Sequence",
          items: [
            {
              type: "Text",
              value: ";",
            },
            {
              type: "Ref",
              captureName: null,
              rule: "ws",
            },
          ],
        },
      },
      {
        type: "Ref",
        captureName: null,
        rule: "ws",
      },
      {
        type: "Text",
        value: "}",
      },
    ],
  },
  label: {
    type: "Ref",
    captureName: null,
    rule: "ident",
  },
  instr: {
    type: "Choice",
    choices: [
      {
        type: "Ref",
        captureName: null,
        rule: "valueInstr",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "gotoInstr",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "forkToInstr",
      },
    ],
  },
  forkToInstr: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        captureName: null,
        rule: "forkToKW",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "ws",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "label",
      },
    ],
  },
  valueInstr: {
    type: "Sequence",
    items: [
      {
        type: "Choice",
        choices: [
          {
            type: "Sequence",
            items: [
              {
                type: "Ref",
                captureName: null,
                rule: "ident",
              },
              {
                type: "Ref",
                captureName: null,
                rule: "ws",
              },
              {
                type: "Text",
                value: "=",
              },
              {
                type: "Ref",
                captureName: null,
                rule: "ws",
              },
            ],
          },
          {
            type: "Text",
            value: "",
          },
        ],
      },
      {
        type: "Ref",
        captureName: null,
        rule: "rvalue",
      },
    ],
  },
  rvalue: {
    type: "Choice",
    choices: [
      {
        type: "Ref",
        captureName: null,
        rule: "call",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "const",
      },
    ],
  },
  call: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        captureName: null,
        rule: "ident",
      },
      {
        type: "Choice",
        choices: [
          {
            type: "Ref",
            captureName: null,
            rule: "params",
          },
          {
            type: "Text",
            value: "",
          },
        ],
      },
    ],
  },
  gotoInstr: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        captureName: null,
        rule: "gotoKW",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "ws",
      },
      {
        type: "Choice",
        choices: [
          {
            type: "Ref",
            captureName: null,
            rule: "label",
          },
          {
            type: "Ref",
            captureName: null,
            rule: "Placeholder",
          },
        ],
      },
      {
        type: "Choice",
        choices: [
          {
            type: "Sequence",
            items: [
              {
                type: "Ref",
                captureName: null,
                rule: "ws",
              },
              {
                type: "Ref",
                captureName: null,
                rule: "ifClause",
              },
            ],
          },
          {
            type: "Text",
            value: "",
          },
        ],
      },
    ],
  },
  ifClause: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        captureName: null,
        rule: "ifKW",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "ws",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "ident",
      },
    ],
  },
  params: {
    type: "Sequence",
    items: [
      {
        type: "Text",
        value: "(",
      },
      {
        type: "RepSep",
        rep: {
          type: "Choice",
          choices: [
            {
              type: "Ref",
              captureName: null,
              rule: "ident",
            },
            {
              type: "Ref",
              captureName: null,
              rule: "Placeholder",
            },
          ],
        },
        sep: {
          type: "Sequence",
          items: [
            {
              type: "Text",
              value: ",",
            },
            {
              type: "Ref",
              captureName: null,
              rule: "ws",
            },
          ],
        },
      },
      {
        type: "Text",
        value: ")",
      },
    ],
  },
  const: {
    type: "Choice",
    choices: [
      {
        type: "Ref",
        captureName: null,
        rule: "string",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "int",
      },
    ],
  },
  gotoKW: {
    type: "Text",
    value: "goto",
  },
  forkToKW: {
    type: "Text",
    value: "forkTo",
  },
  ifKW: {
    type: "Text",
    value: "if",
  },
  int: {
    type: "Sequence",
    items: [
      {
        type: "Char",
        rule: {
          type: "Range",
          from: "0",
          to: "9",
        },
      },
      {
        type: "RepSep",
        rep: {
          type: "Char",
          rule: {
            type: "Range",
            from: "0",
            to: "9",
          },
        },
        sep: {
          type: "Text",
          value: "",
        },
      },
    ],
  },
  Placeholder: {
    type: "Text",
    value: "???",
  },
  ws: {
    type: "RepSep",
    rep: {
      type: "Sequence",
      items: [
        {
          type: "Ref",
          captureName: null,
          rule: "spaces",
        },
        {
          type: "Choice",
          choices: [
            {
              type: "Ref",
              captureName: null,
              rule: "comment",
            },
            {
              type: "Text",
              value: "",
            },
          ],
        },
      ],
    },
    sep: {
      type: "Text",
      value: "\n",
    },
  },
  spaces: {
    type: "RepSep",
    rep: {
      type: "Text",
      value: " ",
    },
    sep: {
      type: "Text",
      value: "",
    },
  },
  string: {
    type: "Sequence",
    items: [
      {
        type: "Text",
        value: '"',
      },
      {
        type: "RepSep",
        rep: {
          type: "Ref",
          captureName: null,
          rule: "stringChar",
        },
        sep: {
          type: "Text",
          value: "",
        },
      },
      {
        type: "Text",
        value: '"',
      },
    ],
  },
  stringChar: {
    type: "Choice",
    choices: [
      {
        type: "Char",
        rule: {
          type: "Not",
          rule: {
            type: "Literal",
            value: '"',
          },
        },
      },
      {
        type: "Sequence",
        items: [
          {
            type: "Char",
            rule: {
              type: "Literal",
              value: "\\",
            },
          },
          {
            type: "Char",
            rule: {
              type: "Literal",
              value: '"',
            },
          },
        ],
      },
    ],
  },
  alpha: {
    type: "Choice",
    choices: [
      {
        type: "Char",
        rule: {
          type: "Range",
          from: "a",
          to: "z",
        },
      },
      {
        type: "Char",
        rule: {
          type: "Range",
          from: "A",
          to: "Z",
        },
      },
      {
        type: "Text",
        value: "_",
      },
    ],
  },
  num: {
    type: "Char",
    rule: {
      type: "Range",
      from: "0",
      to: "9",
    },
  },
  alphaNum: {
    type: "Choice",
    choices: [
      {
        type: "Ref",
        captureName: null,
        rule: "alpha",
      },
      {
        type: "Ref",
        captureName: null,
        rule: "num",
      },
    ],
  },
  ident: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        captureName: null,
        rule: "alpha",
      },
      {
        type: "RepSep",
        rep: {
          type: "Choice",
          choices: [
            {
              type: "Ref",
              captureName: null,
              rule: "alphaNum",
            },
            {
              type: "Text",
              value: ".",
            },
          ],
        },
        sep: {
          type: "Text",
          value: "",
        },
      },
    ],
  },
  comment: {
    type: "Sequence",
    items: [
      {
        type: "Text",
        value: "//",
      },
      {
        type: "RepSep",
        rep: {
          type: "Ref",
          captureName: null,
          rule: "commentChar",
        },
        sep: {
          type: "Text",
          value: "",
        },
      },
    ],
  },
  commentChar: {
    type: "Char",
    rule: {
      type: "Not",
      rule: {
        type: "Literal",
        value: "\n",
      },
    },
  },
};
