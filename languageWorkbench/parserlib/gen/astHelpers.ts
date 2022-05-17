import {
  BinaryOperator,
  CallExpression,
  ContinueStatement,
  Expression,
  Identifier,
  LogicalOperator,
  MemberExpression,
  ObjectExpression,
  Statement,
  VariableDeclaration,
  BlockStatement,
} from "estree";

export function jsIdent(name: string): Identifier {
  return { type: "Identifier", name };
}

export function jsCall(callee: Expression, args: Expression[]): CallExpression {
  return {
    type: "CallExpression",
    callee,
    arguments: args,
    optional: false,
  };
}

export function jsObj(props: { [name: string]: Expression }): ObjectExpression {
  return {
    type: "ObjectExpression",
    properties: Object.keys(props).map((name) => ({
      type: "Property",
      kind: "init",
      key: { type: "Identifier", name },
      value: props[name],
      computed: false,
      method: false,
      shorthand: false,
    })),
  };
}

export function jsMember(obj: Expression, member: string): MemberExpression {
  return {
    type: "MemberExpression",
    object: obj,
    property: { type: "Identifier", name: member },
    computed: false,
    optional: false,
  };
}

export function jsStr(value: string): Expression {
  return { type: "Literal", value };
}

export function jsChain(chain: string[]): Expression {
  if (chain.length === 1) {
    return { type: "Identifier", name: chain[0] };
  }
  return jsMember(
    jsChain(chain.slice(0, chain.length - 1)),
    chain[chain.length - 1]
  );
}

export function jsConstInit(name: string): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    kind: "const",
    declarations: [
      {
        type: "VariableDeclarator",
        id: { type: "Identifier", name },
      },
    ],
  };
}

export function jsConstAssn(
  name: string,
  expr: Expression
): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    kind: "const",
    declarations: [
      {
        type: "VariableDeclarator",
        id: { type: "Identifier", name },
        init: expr,
      },
    ],
  };
}

export function jsBlock(statements: Statement[]): BlockStatement {
  return { type: "BlockStatement", body: statements };
}

export function jsIf(test: Expression, consequent: Statement): Statement {
  return { type: "IfStatement", test, consequent };
}

export function jsBinExpr(
  left: Expression,
  operator: BinaryOperator,
  right: Expression
): Expression {
  return { type: "BinaryExpression", left, operator, right };
}

export function jsLogical(
  left: Expression,
  operator: LogicalOperator,
  right: Expression
): Expression {
  return { type: "LogicalExpression", left, operator, right };
}

export const jsContinue: ContinueStatement = { type: "ContinueStatement" };

export const jsNull: Expression = { type: "Identifier", name: "null" };

export function jsConsoleLog(tag: string, expr: Expression): Statement {
  return {
    type: "ExpressionStatement",
    expression: jsCall(jsChain(["console", "log"]), [jsStr(tag), expr]),
  };
}
