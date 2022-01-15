import { generate } from "astring";
import {
  CallExpression,
  Expression,
  FunctionDeclaration,
  Node,
  Statement,
} from "estree";
import { AndClause, Rec, Rule, Term } from "../types";

const OUT_VAR = "_out";

export function prettyPrintJS(decl: FunctionDeclaration): string {
  return generate(decl);
}

export function generateRule(rule: Rule): FunctionDeclaration {
  const initOut: Node = {
    type: "VariableDeclaration",
    kind: "const",
    declarations: [
      {
        type: "VariableDeclarator",
        id: { type: "Identifier", name: OUT_VAR },
        init: { type: "ArrayExpression", elements: [] },
      },
    ],
  };
  const returnOut: Node = {
    type: "ReturnStatement",
    argument: { type: "Identifier", name: OUT_VAR },
  };

  const joins = rule.body.opts.map((andExpr) =>
    generateJoin(andExpr.clauses, rule.head)
  );

  return {
    type: "FunctionDeclaration",
    id: {
      type: "Identifier",
      name: rule.head.relation,
    },
    params: [{ type: "Identifier", name: "db" }],
    body: {
      type: "BlockStatement",
      body: [initOut, ...joins, returnOut],
    },
  };
}

function generateJoin(join: AndClause[], out: Rec): Statement {
  return generateJoinRecur(null, join, 0, out);
}

function generateJoinRecur(
  outerVar: string | null,
  join: AndClause[],
  depth: number,
  out: Rec
): Statement {
  if (join.length === 0) {
    return {
      type: "ExpressionStatement",
      expression: {
        type: "CallExpression",
        callee: {
          type: "MemberExpression",
          object: { type: "Identifier", name: OUT_VAR },
          property: { type: "Identifier", name: "push" },
          computed: false,
          optional: false,
        },
        arguments: [
          generateSubstituteCall(
            { type: "Identifier", name: bindingsVar(depth - 1) },
            generateTerm(out)
          ),
        ],
        optional: false,
      },
    };
  }
  const clause = join[0];
  if (clause.type === "Record") {
    const thisVar = `${clause.relation}_item_${depth}`;
    const innerLoop = generateJoinRecur(thisVar, join.slice(1), depth + 1, out);
    return {
      type: "ForOfStatement",
      await: false,
      left: {
        type: "VariableDeclaration",
        kind: "const",
        declarations: [
          {
            type: "VariableDeclarator",
            id: { type: "Identifier", name: thisVar },
          },
        ],
      },
      right: {
        type: "MemberExpression",
        object: {
          type: "MemberExpression",
          object: { type: "Identifier", name: "db" },
          property: { type: "Identifier", name: "tables" },
          computed: false,
          optional: false,
        },
        property: { type: "Identifier", name: clause.relation },
        computed: false,
        optional: false,
      },
      body:
        outerVar === null
          ? {
              type: "BlockStatement",
              body: [innerLoop],
            }
          : generateUnifyIfStmt(outerVar, thisVar, innerLoop, depth),
    };
  } else {
    // generate if statement
    throw new Error("TODO: generate if statement for BinExpr");
  }
}

function bindingsVar(depth: number) {
  return `bindings${depth}`;
}

function generateUnifyIfStmt(
  left: string,
  right: string,
  inner: Statement,
  depth: number
): Statement {
  const thisBindingsVar = bindingsVar(depth);
  const outerBindings: Expression =
    depth <= 1
      ? { type: "ObjectExpression", properties: [] }
      : { type: "Identifier", name: bindingsVar(depth - 1) };
  const unifyCall: CallExpression = {
    type: "CallExpression",
    callee: { type: "Identifier", name: "unify" },
    arguments: [
      outerBindings,
      { type: "Identifier", name: left },
      { type: "Identifier", name: right },
    ],
    optional: false,
  };
  const unifyAssnStmt: Statement = {
    type: "VariableDeclaration",
    kind: "const",
    declarations: [
      {
        type: "VariableDeclarator",
        id: { type: "Identifier", name: thisBindingsVar },
        init: unifyCall,
      },
    ],
  };
  const test: Expression = {
    type: "BinaryExpression",
    left: { type: "Identifier", name: thisBindingsVar },
    operator: "!==",
    right: { type: "Identifier", name: "null" },
  };
  return {
    type: "BlockStatement",
    body: [
      unifyAssnStmt,
      {
        type: "IfStatement",
        test,
        consequent: { type: "BlockStatement", body: [inner] },
      },
    ],
  };
}

function generateSubstituteCall(
  bindings: Expression,
  rec: Expression
): Expression {
  return {
    type: "CallExpression",
    callee: { type: "Identifier", name: "substitute" },
    arguments: [rec, bindings],
    optional: false,
  };
}

function generateTerm(term: Term): Expression {
  switch (term.type) {
    case "Record":
      return {
        type: "ObjectExpression",
        properties: [
          {
            type: "Property",
            key: { type: "Identifier", name: "type" },
            value: { type: "Literal", value: "Record" },
            computed: false,
            shorthand: false,
            kind: "init",
            method: false,
          },
          {
            type: "Property",
            key: { type: "Identifier", name: "relation" },
            value: { type: "Literal", value: term.relation },
            computed: false,
            shorthand: false,
            kind: "init",
            method: false,
          },
          // TODO: attrs
        ],
      };
  }
}
