import {textForSpan, childByName, childrenByName, RuleTree} from "../languageWorkbench/parserlib/ruleTree";
export type DLAlpha = {
};
export type DLAlphaNum = {
  alpha: DLAlpha;
  num: DLNum;
};
export type DLArray = {
  term: DLTerm[];
  commaSpace: DLCommaSpace[];
};
export type DLBinExpr = {
  left: DLTerm;
  ws: DLWs;
  binOp: DLBinOp;
  ws: DLWs;
  right: DLTerm;
};
export type DLBinOp = {
};
export type DLBool = {
};
export type DLCommaSpace = {
  ws: DLWs;
};
export type DLComment = {
  commentChar: DLCommentChar[];
};
export type DLCommentChar = {
};
export type DLConjunct = {
  record: DLRecord;
  binExpr: DLBinExpr;
  negation: DLNegation;
  placeholder: DLPlaceholder;
};
export type DLDisjunct = {
  conjunct: DLConjunct[];
  ws: DLWs[];
  ws: DLWs[];
};
export type DLFact = {
  record: DLRecord;
};
export type DLIdent = {
  alpha: DLAlpha;
  alphaNum: DLAlphaNum[];
};
export type DLInt = {
  num: DLNum;
  num: DLNum[];
};
export type DLKeyValue = {
  ident: DLIdent;
  ws: DLWs;
  term: DLTerm;
};
export type DLMain = {
  ws: DLWs;
  stmt: DLStmt[];
  comment: DLComment[];
  ws: DLWs[];
  ws: DLWs;
};
export type DLNegation = {
  record: DLRecord;
};
export type DLNum = {
};
export type DLPlaceholder = {
};
export type DLRecord = {
  ident: DLIdent;
  ws: DLWs;
  recordAttrs: DLRecordAttrs;
  ws: DLWs;
};
export type DLRecordAttrs = {
  keyValue: DLKeyValue[];
  placeholder: DLPlaceholder[];
  commaSpace: DLCommaSpace[];
};
export type DLRule = {
  record: DLRecord;
  ws: DLWs;
  ws: DLWs;
  disjunct: DLDisjunct[];
  ws: DLWs[];
  ws: DLWs[];
};
export type DLStmt = {
  rule: DLRule;
  fact: DLFact;
  tableDecl: DLTableDecl;
};
export type DLString = {
  stringChar: DLStringChar[];
};
export type DLStringChar = {
};
export type DLTableDecl = {
  tableKW: DLTableKW;
  ws: DLWs;
  ident: DLIdent;
};
export type DLTableKW = {
};
export type DLTerm = {
  record: DLRecord;
  int: DLInt;
  var: DLVar;
  string: DLString;
  bool: DLBool;
  array: DLArray;
  placeholder: DLPlaceholder;
};
export type DLVar = {
  alphaNum: DLAlphaNum[];
};
export type DLWs = {
};
function extractAlpha(input: string, node: RuleTree): DLAlpha {
  return {
    __rule__: "alpha",
    __text__: textForSpan(input, node.span)
  };
}
function extractAlphaNum(input: string, node: RuleTree): DLAlphaNum {
  return {
    __rule__: "alphaNum",
    __text__: textForSpan(input, node.span),
    alpha: extractAlpha(input, childByName(node, "alpha")),
    num: extractNum(input, childByName(node, "num"))
  };
}
function extractArray(input: string, node: RuleTree): DLArray {
  return {
    __rule__: "array",
    __text__: textForSpan(input, node.span),
    term: childrenByName(node, "term").map(child => extractTerm(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extractCommaSpace(input, child))
  };
}
function extractBinExpr(input: string, node: RuleTree): DLBinExpr {
  return {
    __rule__: "binExpr",
    __text__: textForSpan(input, node.span),
    left: extractTerm(input, childByName(node, "term")),
    ws: extractWs(input, childByName(node, "ws")),
    binOp: extractBinOp(input, childByName(node, "binOp")),
    right: extractTerm(input, childByName(node, "term"))
  };
}
function extractBinOp(input: string, node: RuleTree): DLBinOp {
  return {
    __rule__: "binOp",
    __text__: textForSpan(input, node.span)
  };
}
function extractBool(input: string, node: RuleTree): DLBool {
  return {
    __rule__: "bool",
    __text__: textForSpan(input, node.span)
  };
}
function extractCommaSpace(input: string, node: RuleTree): DLCommaSpace {
  return {
    __rule__: "commaSpace",
    __text__: textForSpan(input, node.span),
    ws: extractWs(input, childByName(node, "ws"))
  };
}
function extractComment(input: string, node: RuleTree): DLComment {
  return {
    __rule__: "comment",
    __text__: textForSpan(input, node.span),
    commentChar: childrenByName(node, "commentChar").map(child => extractCommentChar(input, child))
  };
}
function extractCommentChar(input: string, node: RuleTree): DLCommentChar {
  return {
    __rule__: "commentChar",
    __text__: textForSpan(input, node.span)
  };
}
function extractConjunct(input: string, node: RuleTree): DLConjunct {
  return {
    __rule__: "conjunct",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record")),
    binExpr: extractBinExpr(input, childByName(node, "binExpr")),
    negation: extractNegation(input, childByName(node, "negation")),
    placeholder: extractPlaceholder(input, childByName(node, "placeholder"))
  };
}
function extractDisjunct(input: string, node: RuleTree): DLDisjunct {
  return {
    __rule__: "disjunct",
    __text__: textForSpan(input, node.span),
    conjunct: childrenByName(node, "conjunct").map(child => extractConjunct(input, child)),
    ws: childrenByName(node, "ws").map(child => extractWs(input, child))
  };
}
function extractFact(input: string, node: RuleTree): DLFact {
  return {
    __rule__: "fact",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record"))
  };
}
function extractIdent(input: string, node: RuleTree): DLIdent {
  return {
    __rule__: "ident",
    __text__: textForSpan(input, node.span),
    alpha: extractAlpha(input, childByName(node, "alpha")),
    alphaNum: childrenByName(node, "alphaNum").map(child => extractAlphaNum(input, child))
  };
}
function extractInt(input: string, node: RuleTree): DLInt {
  return {
    __rule__: "int",
    __text__: textForSpan(input, node.span),
    num: childrenByName(node, "num").map(child => extractNum(input, child))
  };
}
function extractKeyValue(input: string, node: RuleTree): DLKeyValue {
  return {
    __rule__: "keyValue",
    __text__: textForSpan(input, node.span),
    ident: extractIdent(input, childByName(node, "ident")),
    ws: extractWs(input, childByName(node, "ws")),
    term: extractTerm(input, childByName(node, "term"))
  };
}
function extractMain(input: string, node: RuleTree): DLMain {
  return {
    __rule__: "main",
    __text__: textForSpan(input, node.span),
    ws: extractWs(input, childByName(node, "ws")),
    stmt: childrenByName(node, "stmt").map(child => extractStmt(input, child)),
    comment: childrenByName(node, "comment").map(child => extractComment(input, child))
  };
}
function extractNegation(input: string, node: RuleTree): DLNegation {
  return {
    __rule__: "negation",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record"))
  };
}
function extractNum(input: string, node: RuleTree): DLNum {
  return {
    __rule__: "num",
    __text__: textForSpan(input, node.span)
  };
}
function extractPlaceholder(input: string, node: RuleTree): DLPlaceholder {
  return {
    __rule__: "placeholder",
    __text__: textForSpan(input, node.span)
  };
}
function extractRecord(input: string, node: RuleTree): DLRecord {
  return {
    __rule__: "record",
    __text__: textForSpan(input, node.span),
    ident: extractIdent(input, childByName(node, "ident")),
    ws: extractWs(input, childByName(node, "ws")),
    recordAttrs: extractRecordAttrs(input, childByName(node, "recordAttrs"))
  };
}
function extractRecordAttrs(input: string, node: RuleTree): DLRecordAttrs {
  return {
    __rule__: "recordAttrs",
    __text__: textForSpan(input, node.span),
    keyValue: childrenByName(node, "keyValue").map(child => extractKeyValue(input, child)),
    placeholder: childrenByName(node, "placeholder").map(child => extractPlaceholder(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extractCommaSpace(input, child))
  };
}
function extractRule(input: string, node: RuleTree): DLRule {
  return {
    __rule__: "rule",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record")),
    ws: childrenByName(node, "ws").map(child => extractWs(input, child)),
    disjunct: childrenByName(node, "disjunct").map(child => extractDisjunct(input, child))
  };
}
function extractStmt(input: string, node: RuleTree): DLStmt {
  return {
    __rule__: "stmt",
    __text__: textForSpan(input, node.span),
    rule: extractRule(input, childByName(node, "rule")),
    fact: extractFact(input, childByName(node, "fact")),
    tableDecl: extractTableDecl(input, childByName(node, "tableDecl"))
  };
}
function extractString(input: string, node: RuleTree): DLString {
  return {
    __rule__: "string",
    __text__: textForSpan(input, node.span),
    stringChar: childrenByName(node, "stringChar").map(child => extractStringChar(input, child))
  };
}
function extractStringChar(input: string, node: RuleTree): DLStringChar {
  return {
    __rule__: "stringChar",
    __text__: textForSpan(input, node.span)
  };
}
function extractTableDecl(input: string, node: RuleTree): DLTableDecl {
  return {
    __rule__: "tableDecl",
    __text__: textForSpan(input, node.span),
    tableKW: extractTableKW(input, childByName(node, "tableKW")),
    ws: extractWs(input, childByName(node, "ws")),
    ident: extractIdent(input, childByName(node, "ident"))
  };
}
function extractTableKW(input: string, node: RuleTree): DLTableKW {
  return {
    __rule__: "tableKW",
    __text__: textForSpan(input, node.span)
  };
}
function extractTerm(input: string, node: RuleTree): DLTerm {
  return {
    __rule__: "term",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record")),
    int: extractInt(input, childByName(node, "int")),
    var: extractVar(input, childByName(node, "var")),
    string: extractString(input, childByName(node, "string")),
    bool: extractBool(input, childByName(node, "bool")),
    array: extractArray(input, childByName(node, "array")),
    placeholder: extractPlaceholder(input, childByName(node, "placeholder"))
  };
}
function extractVar(input: string, node: RuleTree): DLVar {
  return {
    __rule__: "var",
    __text__: textForSpan(input, node.span),
    alphaNum: childrenByName(node, "alphaNum").map(child => extractAlphaNum(input, child))
  };
}
function extractWs(input: string, node: RuleTree): DLWs {
  return {
    __rule__: "ws",
    __text__: textForSpan(input, node.span)
  };
}