import {textForSpan, childByName, childrenByName} from "../languageWorkbench/parserlib/ruleTree";
type DLAlpha = {
};
type DLAlphaNum = {
  alpha: DLAlpha;
  num: DLNum;
};
type DLArray = {
  term: DLTerm[];
  commaSpace: DLCommaSpace[];
};
type DLBinExpr = {
  left: DLTerm;
  ws: DLWs;
  binOp: DLBinOp;
  ws: DLWs;
  right: DLTerm;
};
type DLBinOp = {
};
type DLBool = {
};
type DLCommaSpace = {
  ws: DLWs;
};
type DLComment = {
  commentChar: DLCommentChar[];
};
type DLCommentChar = {
};
type DLConjunct = {
  record: DLRecord;
  binExpr: DLBinExpr;
  negation: DLNegation;
  placeholder: DLPlaceholder;
};
type DLDisjunct = {
  conjunct: DLConjunct[];
  ws: DLWs[];
  ws: DLWs[];
};
type DLFact = {
  record: DLRecord;
};
type DLIdent = {
  alpha: DLAlpha;
  alphaNum: DLAlphaNum[];
};
type DLInt = {
  num: DLNum;
  num: DLNum[];
};
type DLKeyValue = {
  ident: DLIdent;
  ws: DLWs;
  term: DLTerm;
};
type DLMain = {
  ws: DLWs;
  stmt: DLStmt[];
  comment: DLComment[];
  ws: DLWs[];
  ws: DLWs;
};
type DLNegation = {
  record: DLRecord;
};
type DLNum = {
};
type DLPlaceholder = {
};
type DLRecord = {
  ident: DLIdent;
  ws: DLWs;
  recordAttrs: DLRecordAttrs;
  ws: DLWs;
};
type DLRecordAttrs = {
  keyValue: DLKeyValue[];
  placeholder: DLPlaceholder[];
  commaSpace: DLCommaSpace[];
};
type DLRule = {
  record: DLRecord;
  ws: DLWs;
  ws: DLWs;
  disjunct: DLDisjunct[];
  ws: DLWs[];
  ws: DLWs[];
};
type DLStmt = {
  rule: DLRule;
  fact: DLFact;
  tableDecl: DLTableDecl;
};
type DLString = {
  stringChar: DLStringChar[];
};
type DLStringChar = {
};
type DLTableDecl = {
  tableKW: DLTableKW;
  ws: DLWs;
  ident: DLIdent;
};
type DLTableKW = {
};
type DLTerm = {
  record: DLRecord;
  int: DLInt;
  var: DLVar;
  string: DLString;
  bool: DLBool;
  array: DLArray;
  placeholder: DLPlaceholder;
};
type DLVar = {
  alphaNum: DLAlphaNum[];
};
type DLWs = {
};
function extractAlpha(input, node) {
  return {
    __rule__: "alpha",
    __text__: textForSpan(input, node.span)
  };
}
function extractAlphaNum(input, node) {
  return {
    __rule__: "alphaNum",
    __text__: textForSpan(input, node.span),
    alpha: extractAlpha(input, childByName(node, "alpha")),
    num: extractNum(input, childByName(node, "num"))
  };
}
function extractArray(input, node) {
  return {
    __rule__: "array",
    __text__: textForSpan(input, node.span),
    term: childrenByName(node, "term").map(child => extractTerm(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extractCommaSpace(input, child))
  };
}
function extractBinExpr(input, node) {
  return {
    __rule__: "binExpr",
    __text__: textForSpan(input, node.span),
    left: extractTerm(input, childByName(node, "term")),
    ws: extractWs(input, childByName(node, "ws")),
    binOp: extractBinOp(input, childByName(node, "binOp")),
    right: extractTerm(input, childByName(node, "term"))
  };
}
function extractBinOp(input, node) {
  return {
    __rule__: "binOp",
    __text__: textForSpan(input, node.span)
  };
}
function extractBool(input, node) {
  return {
    __rule__: "bool",
    __text__: textForSpan(input, node.span)
  };
}
function extractCommaSpace(input, node) {
  return {
    __rule__: "commaSpace",
    __text__: textForSpan(input, node.span),
    ws: extractWs(input, childByName(node, "ws"))
  };
}
function extractComment(input, node) {
  return {
    __rule__: "comment",
    __text__: textForSpan(input, node.span),
    commentChar: childrenByName(node, "commentChar").map(child => extractCommentChar(input, child))
  };
}
function extractCommentChar(input, node) {
  return {
    __rule__: "commentChar",
    __text__: textForSpan(input, node.span)
  };
}
function extractConjunct(input, node) {
  return {
    __rule__: "conjunct",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record")),
    binExpr: extractBinExpr(input, childByName(node, "binExpr")),
    negation: extractNegation(input, childByName(node, "negation")),
    placeholder: extractPlaceholder(input, childByName(node, "placeholder"))
  };
}
function extractDisjunct(input, node) {
  return {
    __rule__: "disjunct",
    __text__: textForSpan(input, node.span),
    conjunct: childrenByName(node, "conjunct").map(child => extractConjunct(input, child)),
    ws: childrenByName(node, "ws").map(child => extractWs(input, child))
  };
}
function extractFact(input, node) {
  return {
    __rule__: "fact",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record"))
  };
}
function extractIdent(input, node) {
  return {
    __rule__: "ident",
    __text__: textForSpan(input, node.span),
    alpha: extractAlpha(input, childByName(node, "alpha")),
    alphaNum: childrenByName(node, "alphaNum").map(child => extractAlphaNum(input, child))
  };
}
function extractInt(input, node) {
  return {
    __rule__: "int",
    __text__: textForSpan(input, node.span),
    num: childrenByName(node, "num").map(child => extractNum(input, child))
  };
}
function extractKeyValue(input, node) {
  return {
    __rule__: "keyValue",
    __text__: textForSpan(input, node.span),
    ident: extractIdent(input, childByName(node, "ident")),
    ws: extractWs(input, childByName(node, "ws")),
    term: extractTerm(input, childByName(node, "term"))
  };
}
function extractMain(input, node) {
  return {
    __rule__: "main",
    __text__: textForSpan(input, node.span),
    ws: extractWs(input, childByName(node, "ws")),
    stmt: childrenByName(node, "stmt").map(child => extractStmt(input, child)),
    comment: childrenByName(node, "comment").map(child => extractComment(input, child))
  };
}
function extractNegation(input, node) {
  return {
    __rule__: "negation",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record"))
  };
}
function extractNum(input, node) {
  return {
    __rule__: "num",
    __text__: textForSpan(input, node.span)
  };
}
function extractPlaceholder(input, node) {
  return {
    __rule__: "placeholder",
    __text__: textForSpan(input, node.span)
  };
}
function extractRecord(input, node) {
  return {
    __rule__: "record",
    __text__: textForSpan(input, node.span),
    ident: extractIdent(input, childByName(node, "ident")),
    ws: extractWs(input, childByName(node, "ws")),
    recordAttrs: extractRecordAttrs(input, childByName(node, "recordAttrs"))
  };
}
function extractRecordAttrs(input, node) {
  return {
    __rule__: "recordAttrs",
    __text__: textForSpan(input, node.span),
    keyValue: childrenByName(node, "keyValue").map(child => extractKeyValue(input, child)),
    placeholder: childrenByName(node, "placeholder").map(child => extractPlaceholder(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extractCommaSpace(input, child))
  };
}
function extractRule(input, node) {
  return {
    __rule__: "rule",
    __text__: textForSpan(input, node.span),
    record: extractRecord(input, childByName(node, "record")),
    ws: childrenByName(node, "ws").map(child => extractWs(input, child)),
    disjunct: childrenByName(node, "disjunct").map(child => extractDisjunct(input, child))
  };
}
function extractStmt(input, node) {
  return {
    __rule__: "stmt",
    __text__: textForSpan(input, node.span),
    rule: extractRule(input, childByName(node, "rule")),
    fact: extractFact(input, childByName(node, "fact")),
    tableDecl: extractTableDecl(input, childByName(node, "tableDecl"))
  };
}
function extractString(input, node) {
  return {
    __rule__: "string",
    __text__: textForSpan(input, node.span),
    stringChar: childrenByName(node, "stringChar").map(child => extractStringChar(input, child))
  };
}
function extractStringChar(input, node) {
  return {
    __rule__: "stringChar",
    __text__: textForSpan(input, node.span)
  };
}
function extractTableDecl(input, node) {
  return {
    __rule__: "tableDecl",
    __text__: textForSpan(input, node.span),
    tableKW: extractTableKW(input, childByName(node, "tableKW")),
    ws: extractWs(input, childByName(node, "ws")),
    ident: extractIdent(input, childByName(node, "ident"))
  };
}
function extractTableKW(input, node) {
  return {
    __rule__: "tableKW",
    __text__: textForSpan(input, node.span)
  };
}
function extractTerm(input, node) {
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
function extractVar(input, node) {
  return {
    __rule__: "var",
    __text__: textForSpan(input, node.span),
    alphaNum: childrenByName(node, "alphaNum").map(child => extractAlphaNum(input, child))
  };
}
function extractWs(input, node) {
  return {
    __rule__: "ws",
    __text__: textForSpan(input, node.span)
  };
}