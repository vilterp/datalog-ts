// generated by parserlib; do not edit.
import {
  textForSpan,
  childByName,
  childrenByName,
  RuleTree,
  extractRuleTree,
} from "../../parserlib/ruleTree";
import { Span, Grammar } from "../../parserlib/grammar";
import * as parserlib from "../../parserlib/parser";
export type SQLAlpha = {
  type: "Alpha";
  text: string;
  span: Span;
  value: {};
};
export type SQLAlphaNum = {
  type: "AlphaNum";
  text: string;
  span: Span;
  value: SQLAlpha | SQLNum;
};
export type SQLColSpec = {
  type: "ColSpec";
  text: string;
  span: Span;
  columnName: SQLColumnName;
  _type: SQLType;
  refClause: SQLRefClause;
};
export type SQLColumnName = {
  type: "ColumnName";
  text: string;
  span: Span;
  value: SQLIdent | SQLPlaceholder;
};
export type SQLCommaWS = {
  type: "CommaWS";
  text: string;
  span: Span;
};
export type SQLCreateKW = {
  type: "CreateKW";
  text: string;
  span: Span;
};
export type SQLCreateTableStmt = {
  type: "CreateTableStmt";
  text: string;
  span: Span;
  createKW: SQLCreateKW;
  tableKW: SQLTableKW;
  tableName: SQLTableName;
  colSpec: SQLColSpec[];
  commaWS: SQLCommaWS[];
};
export type SQLFromKW = {
  type: "FromKW";
  text: string;
  span: Span;
};
export type SQLIdent = {
  type: "Ident";
  text: string;
  span: Span;
  alpha: SQLAlpha;
  alphaNum: SQLAlphaNum[];
};
export type SQLMain = {
  type: "Main";
  text: string;
  span: Span;
  statementSemicolon: SQLStatementSemicolon[];
};
export type SQLNum = {
  type: "Num";
  text: string;
  span: Span;
};
export type SQLPlaceholder = {
  type: "Placeholder";
  text: string;
  span: Span;
};
export type SQLRefClause = {
  type: "RefClause";
  text: string;
  span: Span;
  refKW: SQLRefKW;
  tableName: SQLTableName;
  columnName: SQLColumnName;
};
export type SQLRefKW = {
  type: "RefKW";
  text: string;
  span: Span;
};
export type SQLSelectKW = {
  type: "SelectKW";
  text: string;
  span: Span;
};
export type SQLSelectStmt = {
  type: "SelectStmt";
  text: string;
  span: Span;
  selectKW: SQLSelectKW;
  selection: SQLSelection;
  fromKW: SQLFromKW;
  tableName: SQLTableName;
};
export type SQLSelection = {
  type: "Selection";
  text: string;
  span: Span;
  columnName: SQLColumnName[];
  commaWS: SQLCommaWS[];
};
export type SQLStatement = {
  type: "Statement";
  text: string;
  span: Span;
  value: SQLSelectStmt | SQLCreateTableStmt;
};
export type SQLStatementSemicolon = {
  type: "StatementSemicolon";
  text: string;
  span: Span;
  statement: SQLStatement;
};
export type SQLString = {
  type: "String";
  text: string;
  span: Span;
  stringChar: SQLStringChar[];
};
export type SQLStringChar = {
  type: "StringChar";
  text: string;
  span: Span;
  value: {};
};
export type SQLTableKW = {
  type: "TableKW";
  text: string;
  span: Span;
};
export type SQLTableName = {
  type: "TableName";
  text: string;
  span: Span;
  value: SQLIdent | SQLPlaceholder;
};
export type SQLType = {
  type: "Type";
  text: string;
  span: Span;
  value: {};
};
export type SQLWs = {
  type: "Ws";
  text: string;
  span: Span;
};
export function parse(input: string): SQLMain {
  const traceTree = parserlib.parse(GRAMMAR, "main", input);
  const ruleTree = extractRuleTree(traceTree);
  return extractMain(input, ruleTree);
}
function extractAlpha(input: string, node: RuleTree): SQLAlpha {
  return {
    type: "Alpha",
    text: textForSpan(input, node.span),
    span: node.span,
    value: {},
  };
}
function extractAlphaNum(input: string, node: RuleTree): SQLAlphaNum {
  return {
    type: "AlphaNum",
    text: textForSpan(input, node.span),
    span: node.span,
    value: (() => {
      const child = node.children[0];
      switch (child.name) {
        case "alpha": {
          return extractAlpha(input, child);
        }
        case "num": {
          return extractNum(input, child);
        }
      }
    })(),
  };
}
function extractColSpec(input: string, node: RuleTree): SQLColSpec {
  return {
    type: "ColSpec",
    text: textForSpan(input, node.span),
    span: node.span,
    columnName: extractColumnName(input, childByName(node, "columnName")),
    _type: extractType(input, childByName(node, "type")),
    refClause: extractRefClause(input, childByName(node, "refClause")),
  };
}
function extractColumnName(input: string, node: RuleTree): SQLColumnName {
  return {
    type: "ColumnName",
    text: textForSpan(input, node.span),
    span: node.span,
    value: (() => {
      const child = node.children[0];
      switch (child.name) {
        case "ident": {
          return extractIdent(input, child);
        }
        case "placeholder": {
          return extractPlaceholder(input, child);
        }
      }
    })(),
  };
}
function extractCommaWS(input: string, node: RuleTree): SQLCommaWS {
  return {
    type: "CommaWS",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractCreateKW(input: string, node: RuleTree): SQLCreateKW {
  return {
    type: "CreateKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractCreateTableStmt(
  input: string,
  node: RuleTree
): SQLCreateTableStmt {
  return {
    type: "CreateTableStmt",
    text: textForSpan(input, node.span),
    span: node.span,
    createKW: extractCreateKW(input, childByName(node, "createKW")),
    tableKW: extractTableKW(input, childByName(node, "tableKW")),
    tableName: extractTableName(input, childByName(node, "tableName")),
    colSpec: childrenByName(node, "colSpec").map((child) =>
      extractColSpec(input, child)
    ),
    commaWS: childrenByName(node, "commaWS").map((child) =>
      extractCommaWS(input, child)
    ),
  };
}
function extractFromKW(input: string, node: RuleTree): SQLFromKW {
  return {
    type: "FromKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractIdent(input: string, node: RuleTree): SQLIdent {
  return {
    type: "Ident",
    text: textForSpan(input, node.span),
    span: node.span,
    alpha: extractAlpha(input, childByName(node, "alpha")),
    alphaNum: childrenByName(node, "alphaNum").map((child) =>
      extractAlphaNum(input, child)
    ),
  };
}
function extractMain(input: string, node: RuleTree): SQLMain {
  return {
    type: "Main",
    text: textForSpan(input, node.span),
    span: node.span,
    statementSemicolon: childrenByName(
      node,
      "statementSemicolon"
    ).map((child) => extractStatementSemicolon(input, child)),
  };
}
function extractNum(input: string, node: RuleTree): SQLNum {
  return {
    type: "Num",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractPlaceholder(input: string, node: RuleTree): SQLPlaceholder {
  return {
    type: "Placeholder",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractRefClause(input: string, node: RuleTree): SQLRefClause {
  return {
    type: "RefClause",
    text: textForSpan(input, node.span),
    span: node.span,
    refKW: extractRefKW(input, childByName(node, "refKW")),
    tableName: extractTableName(input, childByName(node, "tableName")),
    columnName: extractColumnName(input, childByName(node, "columnName")),
  };
}
function extractRefKW(input: string, node: RuleTree): SQLRefKW {
  return {
    type: "RefKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractSelectKW(input: string, node: RuleTree): SQLSelectKW {
  return {
    type: "SelectKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractSelectStmt(input: string, node: RuleTree): SQLSelectStmt {
  return {
    type: "SelectStmt",
    text: textForSpan(input, node.span),
    span: node.span,
    selectKW: extractSelectKW(input, childByName(node, "selectKW")),
    selection: extractSelection(input, childByName(node, "selection")),
    fromKW: extractFromKW(input, childByName(node, "fromKW")),
    tableName: extractTableName(input, childByName(node, "tableName")),
  };
}
function extractSelection(input: string, node: RuleTree): SQLSelection {
  return {
    type: "Selection",
    text: textForSpan(input, node.span),
    span: node.span,
    columnName: childrenByName(node, "columnName").map((child) =>
      extractColumnName(input, child)
    ),
    commaWS: childrenByName(node, "commaWS").map((child) =>
      extractCommaWS(input, child)
    ),
  };
}
function extractStatement(input: string, node: RuleTree): SQLStatement {
  return {
    type: "Statement",
    text: textForSpan(input, node.span),
    span: node.span,
    value: (() => {
      const child = node.children[0];
      switch (child.name) {
        case "selectStmt": {
          return extractSelectStmt(input, child);
        }
        case "createTableStmt": {
          return extractCreateTableStmt(input, child);
        }
      }
    })(),
  };
}
function extractStatementSemicolon(
  input: string,
  node: RuleTree
): SQLStatementSemicolon {
  return {
    type: "StatementSemicolon",
    text: textForSpan(input, node.span),
    span: node.span,
    statement: extractStatement(input, childByName(node, "statement")),
  };
}
function extractString(input: string, node: RuleTree): SQLString {
  return {
    type: "String",
    text: textForSpan(input, node.span),
    span: node.span,
    stringChar: childrenByName(node, "stringChar").map((child) =>
      extractStringChar(input, child)
    ),
  };
}
function extractStringChar(input: string, node: RuleTree): SQLStringChar {
  return {
    type: "StringChar",
    text: textForSpan(input, node.span),
    span: node.span,
    value: {},
  };
}
function extractTableKW(input: string, node: RuleTree): SQLTableKW {
  return {
    type: "TableKW",
    text: textForSpan(input, node.span),
    span: node.span,
  };
}
function extractTableName(input: string, node: RuleTree): SQLTableName {
  return {
    type: "TableName",
    text: textForSpan(input, node.span),
    span: node.span,
    value: (() => {
      const child = node.children[0];
      switch (child.name) {
        case "ident": {
          return extractIdent(input, child);
        }
        case "placeholder": {
          return extractPlaceholder(input, child);
        }
      }
    })(),
  };
}
function extractType(input: string, node: RuleTree): SQLType {
  return {
    type: "Type",
    text: textForSpan(input, node.span),
    span: node.span,
    value: {},
  };
}
const GRAMMAR: Grammar = {
  main: {
    type: "RepSep",
    rep: {
      type: "Ref",
      rule: "statementSemicolon",
      captureName: null,
    },
    sep: {
      type: "Ref",
      rule: "ws",
      captureName: null,
    },
  },
  statementSemicolon: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        rule: "statement",
        captureName: null,
      },
      {
        type: "Text",
        value: ";",
      },
    ],
  },
  statement: {
    type: "Choice",
    choices: [
      {
        type: "Ref",
        rule: "selectStmt",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "createTableStmt",
        captureName: null,
      },
    ],
  },
  selectStmt: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        rule: "selectKW",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "selection",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "fromKW",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "tableName",
        captureName: null,
      },
    ],
  },
  selection: {
    type: "RepSep",
    rep: {
      type: "Ref",
      rule: "columnName",
      captureName: null,
    },
    sep: {
      type: "Ref",
      rule: "commaWS",
      captureName: null,
    },
  },
  createTableStmt: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        rule: "createKW",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "tableKW",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "tableName",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Text",
        value: "(",
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "RepSep",
        rep: {
          type: "Ref",
          rule: "colSpec",
          captureName: null,
        },
        sep: {
          type: "Ref",
          rule: "commaWS",
          captureName: null,
        },
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Text",
        value: ")",
      },
    ],
  },
  colSpec: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        rule: "columnName",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "type",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Choice",
        choices: [
          {
            type: "Ref",
            rule: "refClause",
            captureName: null,
          },
          {
            type: "Text",
            value: "",
          },
        ],
      },
    ],
  },
  refClause: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        rule: "refKW",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "tableName",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
      {
        type: "Text",
        value: "(",
      },
      {
        type: "Ref",
        rule: "columnName",
        captureName: null,
      },
      {
        type: "Text",
        value: ")",
      },
    ],
  },
  type: {
    type: "Choice",
    choices: [
      {
        type: "Text",
        value: "INT",
      },
      {
        type: "Text",
        value: "TEXT",
      },
    ],
  },
  columnName: {
    type: "Choice",
    choices: [
      {
        type: "Ref",
        rule: "ident",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "placeholder",
        captureName: null,
      },
    ],
  },
  tableName: {
    type: "Choice",
    choices: [
      {
        type: "Ref",
        rule: "ident",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "placeholder",
        captureName: null,
      },
    ],
  },
  createKW: {
    type: "Text",
    value: "CREATE",
  },
  tableKW: {
    type: "Text",
    value: "TABLE",
  },
  selectKW: {
    type: "Text",
    value: "SELECT",
  },
  fromKW: {
    type: "Text",
    value: "FROM",
  },
  refKW: {
    type: "Text",
    value: "REFERENCES",
  },
  ident: {
    type: "Sequence",
    items: [
      {
        type: "Ref",
        rule: "alpha",
        captureName: null,
      },
      {
        type: "RepSep",
        rep: {
          type: "Choice",
          choices: [
            {
              type: "Ref",
              rule: "alphaNum",
              captureName: null,
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
          rule: "stringChar",
          captureName: null,
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
        rule: "alpha",
        captureName: null,
      },
      {
        type: "Ref",
        rule: "num",
        captureName: null,
      },
    ],
  },
  ws: {
    type: "RepSep",
    rep: {
      type: "Choice",
      choices: [
        {
          type: "Text",
          value: " ",
        },
        {
          type: "Text",
          value: "\n",
        },
      ],
    },
    sep: {
      type: "Text",
      value: "",
    },
  },
  commaWS: {
    type: "Sequence",
    items: [
      {
        type: "Text",
        value: ",",
      },
      {
        type: "Ref",
        rule: "ws",
        captureName: null,
      },
    ],
  },
  placeholder: {
    type: "Text",
    value: "???",
  },
};
