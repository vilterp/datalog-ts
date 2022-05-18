import {textForSpan, childByName, childrenByName, RuleTree} from "../languageWorkbench/parserlib/ruleTree";
import {Span} from "../languageWorkbench/parserlib/grammar";
export type DLAlpha = {
  type: "Alpha";
  text: string;
  span: Span;
};
export type DLAlphaNum = {
  type: "AlphaNum";
  text: string;
  span: Span;
  alpha: DLAlpha;
  num: DLNum;
};
export type DLArray = {
  type: "Array";
  text: string;
  span: Span;
  term: DLTerm[];
  commaSpace: DLCommaSpace[];
};
export type DLBinExpr = {
  type: "BinExpr";
  text: string;
  span: Span;
  left: DLTerm;
  binOp: DLBinOp;
  right: DLTerm;
};
export type DLBinOp = {
  type: "BinOp";
  text: string;
  span: Span;
};
export type DLBool = {
  type: "Bool";
  text: string;
  span: Span;
};
export type DLCommaSpace = {
  type: "CommaSpace";
  text: string;
  span: Span;
};
export type DLComment = {
  type: "Comment";
  text: string;
  span: Span;
  commentChar: DLCommentChar[];
};
export type DLCommentChar = {
  type: "CommentChar";
  text: string;
  span: Span;
};
export type DLConjunct = {
  type: "Conjunct";
  text: string;
  span: Span;
  record: DLRecord;
  binExpr: DLBinExpr;
  negation: DLNegation;
  placeholder: DLPlaceholder;
};
export type DLDisjunct = {
  type: "Disjunct";
  text: string;
  span: Span;
  conjunct: DLConjunct[];
};
export type DLFact = {
  type: "Fact";
  text: string;
  span: Span;
  record: DLRecord;
};
export type DLIdent = {
  type: "Ident";
  text: string;
  span: Span;
  alpha: DLAlpha;
  alphaNum: DLAlphaNum[];
};
export type DLInt = {
  type: "Int";
  text: string;
  span: Span;
  first: DLNum;
  num: DLNum[];
};
export type DLKeyValue = {
  type: "KeyValue";
  text: string;
  span: Span;
  ident: DLIdent;
  term: DLTerm;
};
export type DLMain = {
  type: "Main";
  text: string;
  span: Span;
  stmt: DLStmt[];
  comment: DLComment[];
};
export type DLNegation = {
  type: "Negation";
  text: string;
  span: Span;
  record: DLRecord;
};
export type DLNum = {
  type: "Num";
  text: string;
  span: Span;
};
export type DLPlaceholder = {
  type: "Placeholder";
  text: string;
  span: Span;
};
export type DLRecord = {
  type: "Record";
  text: string;
  span: Span;
  ident: DLIdent;
  recordAttrs: DLRecordAttrs;
};
export type DLRecordAttrs = {
  type: "RecordAttrs";
  text: string;
  span: Span;
  keyValue: DLKeyValue[];
  placeholder: DLPlaceholder[];
  commaSpace: DLCommaSpace[];
};
export type DLRule = {
  type: "Rule";
  text: string;
  span: Span;
  record: DLRecord;
  disjunct: DLDisjunct[];
};
export type DLStmt = {
  type: "Stmt";
  text: string;
  span: Span;
  rule: DLRule;
  fact: DLFact;
  tableDecl: DLTableDecl;
};
export type DLString = {
  type: "String";
  text: string;
  span: Span;
  stringChar: DLStringChar[];
};
export type DLStringChar = {
  type: "StringChar";
  text: string;
  span: Span;
};
export type DLTableDecl = {
  type: "TableDecl";
  text: string;
  span: Span;
  tableKW: DLTableKW;
  ident: DLIdent;
};
export type DLTableKW = {
  type: "TableKW";
  text: string;
  span: Span;
};
export type DLTerm = {
  type: "Term";
  text: string;
  span: Span;
  record: DLRecord;
  int: DLInt;
  var: DLVar;
  string: DLString;
  bool: DLBool;
  array: DLArray;
  placeholder: DLPlaceholder;
};
export type DLVar = {
  type: "Var";
  text: string;
  span: Span;
  alphaNum: DLAlphaNum[];
};
export type DLWs = {
  type: "Ws";
  text: string;
  span: Span;
};
function extractAlpha(input: string, node: RuleTree): DLAlpha {
  return {
    type: "Alpha",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractAlphaNum(input: string, node: RuleTree): DLAlphaNum {
  return {
    type: "AlphaNum",
    text: textForSpan(input, node.span),
    span: node.span,
    alpha: extractAlpha(input, childByName(node, "alpha")),
    num: extractNum(input, childByName(node, "num"))
  };
}
function extractArray(input: string, node: RuleTree): DLArray {
  return {
    type: "Array",
    text: textForSpan(input, node.span),
    span: node.span,
    term: childrenByName(node, "term").map(child => extractTerm(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extractCommaSpace(input, child))
  };
}
function extractBinExpr(input: string, node: RuleTree): DLBinExpr {
  return {
    type: "BinExpr",
    text: textForSpan(input, node.span),
    span: node.span,
    left: extractTerm(input, childByName(node, "term")),
    binOp: extractBinOp(input, childByName(node, "binOp")),
    right: extractTerm(input, childByName(node, "term"))
  };
}
function extractBinOp(input: string, node: RuleTree): DLBinOp {
  return {
    type: "BinOp",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractBool(input: string, node: RuleTree): DLBool {
  return {
    type: "Bool",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractCommaSpace(input: string, node: RuleTree): DLCommaSpace {
  return {
    type: "CommaSpace",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractComment(input: string, node: RuleTree): DLComment {
  return {
    type: "Comment",
    text: textForSpan(input, node.span),
    span: node.span,
    commentChar: childrenByName(node, "commentChar").map(child => extractCommentChar(input, child))
  };
}
function extractCommentChar(input: string, node: RuleTree): DLCommentChar {
  return {
    type: "CommentChar",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractConjunct(input: string, node: RuleTree): DLConjunct {
  return {
    type: "Conjunct",
    text: textForSpan(input, node.span),
    span: node.span,
    record: extractRecord(input, childByName(node, "record")),
    binExpr: extractBinExpr(input, childByName(node, "binExpr")),
    negation: extractNegation(input, childByName(node, "negation")),
    placeholder: extractPlaceholder(input, childByName(node, "placeholder"))
  };
}
function extractDisjunct(input: string, node: RuleTree): DLDisjunct {
  return {
    type: "Disjunct",
    text: textForSpan(input, node.span),
    span: node.span,
    conjunct: childrenByName(node, "conjunct").map(child => extractConjunct(input, child))
  };
}
function extractFact(input: string, node: RuleTree): DLFact {
  return {
    type: "Fact",
    text: textForSpan(input, node.span),
    span: node.span,
    record: extractRecord(input, childByName(node, "record"))
  };
}
function extractIdent(input: string, node: RuleTree): DLIdent {
  return {
    type: "Ident",
    text: textForSpan(input, node.span),
    span: node.span,
    alpha: extractAlpha(input, childByName(node, "alpha")),
    alphaNum: childrenByName(node, "alphaNum").map(child => extractAlphaNum(input, child))
  };
}
function extractInt(input: string, node: RuleTree): DLInt {
  return {
    type: "Int",
    text: textForSpan(input, node.span),
    span: node.span,
    first: extractNum(input, childByName(node, "num")),
    num: childrenByName(node, "num").map(child => extractNum(input, child))
  };
}
function extractKeyValue(input: string, node: RuleTree): DLKeyValue {
  return {
    type: "KeyValue",
    text: textForSpan(input, node.span),
    span: node.span,
    ident: extractIdent(input, childByName(node, "ident")),
    term: extractTerm(input, childByName(node, "term"))
  };
}
function extractMain(input: string, node: RuleTree): DLMain {
  return {
    type: "Main",
    text: textForSpan(input, node.span),
    span: node.span,
    stmt: childrenByName(node, "stmt").map(child => extractStmt(input, child)),
    comment: childrenByName(node, "comment").map(child => extractComment(input, child))
  };
}
function extractNegation(input: string, node: RuleTree): DLNegation {
  return {
    type: "Negation",
    text: textForSpan(input, node.span),
    span: node.span,
    record: extractRecord(input, childByName(node, "record"))
  };
}
function extractNum(input: string, node: RuleTree): DLNum {
  return {
    type: "Num",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractPlaceholder(input: string, node: RuleTree): DLPlaceholder {
  return {
    type: "Placeholder",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractRecord(input: string, node: RuleTree): DLRecord {
  return {
    type: "Record",
    text: textForSpan(input, node.span),
    span: node.span,
    ident: extractIdent(input, childByName(node, "ident")),
    recordAttrs: extractRecordAttrs(input, childByName(node, "recordAttrs"))
  };
}
function extractRecordAttrs(input: string, node: RuleTree): DLRecordAttrs {
  return {
    type: "RecordAttrs",
    text: textForSpan(input, node.span),
    span: node.span,
    keyValue: childrenByName(node, "keyValue").map(child => extractKeyValue(input, child)),
    placeholder: childrenByName(node, "placeholder").map(child => extractPlaceholder(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extractCommaSpace(input, child))
  };
}
function extractRule(input: string, node: RuleTree): DLRule {
  return {
    type: "Rule",
    text: textForSpan(input, node.span),
    span: node.span,
    record: extractRecord(input, childByName(node, "record")),
    disjunct: childrenByName(node, "disjunct").map(child => extractDisjunct(input, child))
  };
}
function extractStmt(input: string, node: RuleTree): DLStmt {
  return {
    type: "Stmt",
    text: textForSpan(input, node.span),
    span: node.span,
    rule: extractRule(input, childByName(node, "rule")),
    fact: extractFact(input, childByName(node, "fact")),
    tableDecl: extractTableDecl(input, childByName(node, "tableDecl"))
  };
}
function extractString(input: string, node: RuleTree): DLString {
  return {
    type: "String",
    text: textForSpan(input, node.span),
    span: node.span,
    stringChar: childrenByName(node, "stringChar").map(child => extractStringChar(input, child))
  };
}
function extractStringChar(input: string, node: RuleTree): DLStringChar {
  return {
    type: "StringChar",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractTableDecl(input: string, node: RuleTree): DLTableDecl {
  return {
    type: "TableDecl",
    text: textForSpan(input, node.span),
    span: node.span,
    tableKW: extractTableKW(input, childByName(node, "tableKW")),
    ident: extractIdent(input, childByName(node, "ident"))
  };
}
function extractTableKW(input: string, node: RuleTree): DLTableKW {
  return {
    type: "TableKW",
    text: textForSpan(input, node.span),
    span: node.span
  };
}
function extractTerm(input: string, node: RuleTree): DLTerm {
  return {
    type: "Term",
    text: textForSpan(input, node.span),
    span: node.span,
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
    type: "Var",
    text: textForSpan(input, node.span),
    span: node.span,
    alphaNum: childrenByName(node, "alphaNum").map(child => extractAlphaNum(input, child))
  };
}