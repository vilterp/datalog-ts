import { generate } from "astring";
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
  ArrowFunctionExpression,
  ImportDeclaration,
  SwitchStatement,
  ReturnStatement,
} from "estree";

export type ProgramWithTypes = {
  type: "ProgramWithTypes";
  leadingComments: string[];
  imports: (ImportDeclaration | string)[];
  types: TypeDeclaration[];
  declarations: (TypedFunctionDeclaration | string)[];
};

export type TypeDeclaration = {
  type: "TypeDeclaration";
  name: string;
  expr: TypeExpr;
  exported?: boolean;
};

export type TypedFunctionDeclaration = {
  type: "TypedFunctionDeclaration";
  name: string;
  params: TypedParam[];
  returnType: TypeExpr;
  body: BlockStatement;
  exported?: boolean;
};

export type TypedParam = {
  type: "TypedParam";
  name: string;
  typeExpr: TypeExpr;
};

export function tsTypedParam(name: string, typeExpr: TypeExpr): TypedParam {
  return { type: "TypedParam", name, typeExpr };
}

export type TypeExpr =
  | { type: "NamedType"; name: string }
  | { type: "ArrayType"; inner: TypeExpr }
  | { type: "StringLiteralType"; str: string }
  | { type: "UnionType"; choices: TypeExpr[] }
  | { type: "ObjectLiteralType"; members: ObjectLiteralMember[] };

export type ObjectLiteralMember = { name: string; type: TypeExpr };

export function tsArrayType(inner: TypeExpr): TypeExpr {
  return { type: "ArrayType", inner };
}

export function tsTypeName(name: string): TypeExpr {
  return { type: "NamedType", name };
}

export function tsTypeString(str: string): TypeExpr {
  return { type: "StringLiteralType", str };
}

export function tsUnionType(choices: TypeExpr[]): TypeExpr {
  return { type: "UnionType", choices };
}

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

export function jsSwitch(
  discriminant: Expression,
  cases: { name: string; block: BlockStatement }[]
): SwitchStatement {
  return {
    type: "SwitchStatement",
    discriminant: discriminant,
    cases: cases.map((switchCase) => {
      return {
        type: "SwitchCase",
        test: jsStr(switchCase.name),
        consequent: [switchCase.block],
      };
    }),
  };
}

export function jsReturn(expr: Expression): ReturnStatement {
  return {
    type: "ReturnStatement",
    argument: expr,
  };
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

export function jsArrowFunc(
  params: string[],
  body: Expression
): ArrowFunctionExpression {
  return {
    type: "ArrowFunctionExpression",
    expression: true,
    params: params.map(jsIdent),
    body,
  };
}

export const jsContinue: ContinueStatement = { type: "ContinueStatement" };

export const jsNull: Expression = { type: "Identifier", name: "null" };

export function jsConsoleLog(tag: string, expr: Expression): Statement {
  return {
    type: "ExpressionStatement",
    expression: jsCall(jsChain(["console", "log"]), [jsStr(tag), expr]),
  };
}

export function jsImport(path: string, idents: string[]): ImportDeclaration {
  return {
    type: "ImportDeclaration",
    source: {
      type: "Literal",
      value: path,
    },
    specifiers: idents.map((ident) => ({
      type: "ImportSpecifier",
      imported: jsIdent(ident),
      local: jsIdent(ident),
    })),
  };
}

export function prettyPrintProgramWithTypes(prog: ProgramWithTypes): string {
  return [
    ...prog.leadingComments.map((comment) => `// ${comment}`),
    ...prog.imports.map((i) => (typeof i === "string" ? i : generate(i))),
    ...prog.types.map(prettyPrintTypeDeclaration),
    ...prog.declarations.map((d) =>
      typeof d === "string" ? d : prettyPrintTypedFunctionDeclaration(d)
    ),
  ].join("\n");
}

export function prettyPrintTypeDeclaration(decl: TypeDeclaration): string {
  return `${decl.exported ? "export " : ""}type ${
    decl.name
  } = ${prettyPrintTypeExpr(decl.expr)};`;
}

export function prettyPrintTypeExpr(expr: TypeExpr): string {
  switch (expr.type) {
    case "ArrayType":
      return prettyPrintTypeExpr(expr.inner) + "[]";
    case "NamedType":
      return expr.name;
    case "StringLiteralType":
      return JSON.stringify(expr.str);
    case "UnionType":
      return expr.choices.length > 0
        ? expr.choices.map(prettyPrintTypeExpr).join(" | ")
        : "{}";
    case "ObjectLiteralType":
      return [
        "{",
        ...expr.members.map(
          (member) => `  ${member.name}: ${prettyPrintTypeExpr(member.type)};`
        ),
        "}",
      ].join("\n");
  }
}

export function prettyPrintTypedFunctionDeclaration(
  decl: TypedFunctionDeclaration
): string {
  return `${decl.exported ? "export " : ""}function ${decl.name}(${decl.params
    .map(prettyPrintTypedParam)
    .join(", ")}): ${prettyPrintTypeExpr(decl.returnType)} ${generate(
    decl.body
  )}`;
}

function prettyPrintTypedParam(param: TypedParam): string {
  return `${param.name}: ${prettyPrintTypeExpr(param.typeExpr)}`;
}
