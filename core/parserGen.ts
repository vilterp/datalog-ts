import {textForSpan} from "../languageWorkbench/parserlib/ruleTree";
function extract_alpha(input, node) {
  return {
    __rule__: "alpha",
    __text__: textForSpan(input, node.span)
  };
}
function extract_alphaNum(input, node) {
  return {
    __rule__: "alphaNum",
    __text__: textForSpan(input, node.span),
    alpha: extract_alpha(input, childByName(node, "alpha")),
    num: extract_num(input, childByName(node, "num"))
  };
}
function extract_array(input, node) {
  return {
    __rule__: "array",
    __text__: textForSpan(input, node.span),
    term: childrenByName(node, "term").map(child => extract_term(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extract_commaSpace(input, child))
  };
}
function extract_binExpr(input, node) {
  return {
    __rule__: "binExpr",
    __text__: textForSpan(input, node.span),
    left: extract_term(input, childByName(node, "term")),
    ws: extract_ws(input, childByName(node, "ws")),
    binOp: extract_binOp(input, childByName(node, "binOp")),
    right: extract_term(input, childByName(node, "term"))
  };
}
function extract_binOp(input, node) {
  return {
    __rule__: "binOp",
    __text__: textForSpan(input, node.span)
  };
}
function extract_bool(input, node) {
  return {
    __rule__: "bool",
    __text__: textForSpan(input, node.span)
  };
}
function extract_commaSpace(input, node) {
  return {
    __rule__: "commaSpace",
    __text__: textForSpan(input, node.span),
    ws: extract_ws(input, childByName(node, "ws"))
  };
}
function extract_comment(input, node) {
  return {
    __rule__: "comment",
    __text__: textForSpan(input, node.span),
    commentChar: childrenByName(node, "commentChar").map(child => extract_commentChar(input, child))
  };
}
function extract_commentChar(input, node) {
  return {
    __rule__: "commentChar",
    __text__: textForSpan(input, node.span)
  };
}
function extract_conjunct(input, node) {
  return {
    __rule__: "conjunct",
    __text__: textForSpan(input, node.span),
    record: extract_record(input, childByName(node, "record")),
    binExpr: extract_binExpr(input, childByName(node, "binExpr")),
    negation: extract_negation(input, childByName(node, "negation")),
    placeholder: extract_placeholder(input, childByName(node, "placeholder"))
  };
}
function extract_disjunct(input, node) {
  return {
    __rule__: "disjunct",
    __text__: textForSpan(input, node.span),
    conjunct: childrenByName(node, "conjunct").map(child => extract_conjunct(input, child)),
    ws: childrenByName(node, "ws").map(child => extract_ws(input, child))
  };
}
function extract_fact(input, node) {
  return {
    __rule__: "fact",
    __text__: textForSpan(input, node.span),
    record: extract_record(input, childByName(node, "record"))
  };
}
function extract_ident(input, node) {
  return {
    __rule__: "ident",
    __text__: textForSpan(input, node.span),
    alpha: extract_alpha(input, childByName(node, "alpha")),
    alphaNum: childrenByName(node, "alphaNum").map(child => extract_alphaNum(input, child))
  };
}
function extract_int(input, node) {
  return {
    __rule__: "int",
    __text__: textForSpan(input, node.span),
    num: childrenByName(node, "num").map(child => extract_num(input, child))
  };
}
function extract_keyValue(input, node) {
  return {
    __rule__: "keyValue",
    __text__: textForSpan(input, node.span),
    ident: extract_ident(input, childByName(node, "ident")),
    ws: extract_ws(input, childByName(node, "ws")),
    term: extract_term(input, childByName(node, "term"))
  };
}
function extract_main(input, node) {
  return {
    __rule__: "main",
    __text__: textForSpan(input, node.span),
    ws: extract_ws(input, childByName(node, "ws")),
    stmt: childrenByName(node, "stmt").map(child => extract_stmt(input, child)),
    comment: childrenByName(node, "comment").map(child => extract_comment(input, child))
  };
}
function extract_negation(input, node) {
  return {
    __rule__: "negation",
    __text__: textForSpan(input, node.span),
    record: extract_record(input, childByName(node, "record"))
  };
}
function extract_num(input, node) {
  return {
    __rule__: "num",
    __text__: textForSpan(input, node.span)
  };
}
function extract_placeholder(input, node) {
  return {
    __rule__: "placeholder",
    __text__: textForSpan(input, node.span)
  };
}
function extract_record(input, node) {
  return {
    __rule__: "record",
    __text__: textForSpan(input, node.span),
    ident: extract_ident(input, childByName(node, "ident")),
    ws: extract_ws(input, childByName(node, "ws")),
    recordAttrs: extract_recordAttrs(input, childByName(node, "recordAttrs"))
  };
}
function extract_recordAttrs(input, node) {
  return {
    __rule__: "recordAttrs",
    __text__: textForSpan(input, node.span),
    keyValue: childrenByName(node, "keyValue").map(child => extract_keyValue(input, child)),
    placeholder: childrenByName(node, "placeholder").map(child => extract_placeholder(input, child)),
    commaSpace: childrenByName(node, "commaSpace").map(child => extract_commaSpace(input, child))
  };
}
function extract_rule(input, node) {
  return {
    __rule__: "rule",
    __text__: textForSpan(input, node.span),
    record: extract_record(input, childByName(node, "record")),
    ws: childrenByName(node, "ws").map(child => extract_ws(input, child)),
    disjunct: childrenByName(node, "disjunct").map(child => extract_disjunct(input, child))
  };
}
function extract_stmt(input, node) {
  return {
    __rule__: "stmt",
    __text__: textForSpan(input, node.span),
    rule: extract_rule(input, childByName(node, "rule")),
    fact: extract_fact(input, childByName(node, "fact")),
    tableDecl: extract_tableDecl(input, childByName(node, "tableDecl"))
  };
}
function extract_string(input, node) {
  return {
    __rule__: "string",
    __text__: textForSpan(input, node.span),
    stringChar: childrenByName(node, "stringChar").map(child => extract_stringChar(input, child))
  };
}
function extract_stringChar(input, node) {
  return {
    __rule__: "stringChar",
    __text__: textForSpan(input, node.span)
  };
}
function extract_tableDecl(input, node) {
  return {
    __rule__: "tableDecl",
    __text__: textForSpan(input, node.span),
    tableKW: extract_tableKW(input, childByName(node, "tableKW")),
    ws: extract_ws(input, childByName(node, "ws")),
    ident: extract_ident(input, childByName(node, "ident"))
  };
}
function extract_tableKW(input, node) {
  return {
    __rule__: "tableKW",
    __text__: textForSpan(input, node.span)
  };
}
function extract_term(input, node) {
  return {
    __rule__: "term",
    __text__: textForSpan(input, node.span),
    record: extract_record(input, childByName(node, "record")),
    int: extract_int(input, childByName(node, "int")),
    var: extract_var(input, childByName(node, "var")),
    string: extract_string(input, childByName(node, "string")),
    bool: extract_bool(input, childByName(node, "bool")),
    array: extract_array(input, childByName(node, "array")),
    placeholder: extract_placeholder(input, childByName(node, "placeholder"))
  };
}
function extract_var(input, node) {
  return {
    __rule__: "var",
    __text__: textForSpan(input, node.span),
    alphaNum: childrenByName(node, "alphaNum").map(child => extract_alphaNum(input, child))
  };
}
function extract_ws(input, node) {
  return {
    __rule__: "ws",
    __text__: textForSpan(input, node.span)
  };
}
