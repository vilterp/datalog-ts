import { generate } from "astring";
import {
  CallExpression,
  Expression,
  FunctionDeclaration,
  Node,
  Statement,
} from "estree";
import { flatMap } from "../../util/util";
import { AndClause, AndExpr, Rec, Rule, Term } from "../types";

const OUT_VAR = "_out";

export function prettyPrintJS(decl: FunctionDeclaration): string {
  return generate(decl);
}

export function generateRule(rule: Rule): FunctionDeclaration {
  const rulesUsed = flatMap(rule.body.opts, (andExpr) =>
    flatMap(andExpr.clauses, (clause) =>
      clause.type == "Record" ? [clause.relation] : []
    )
  );

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
    params: rulesUsed.map((name) => ({ type: "Identifier", name })),
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
  const bindingsVar = `bindings${depth}`;
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
            { type: "Identifier", name: bindingsVar },
            generateTerm(out)
          ),
        ],
        optional: false,
      },
    };
  }
  const clause = join[0];
  const innerLoop = generateJoin(join.slice(1), out);
  if (clause.type === "Record") {
    const thisVar = `${clause.relation}_item`;
    return {
      type: "ForOfStatement",
      await: false,
      left: { type: "Identifier", name: thisVar },
      right: { type: "Identifier", name: clause.relation },
      body:
        outerVar === null
          ? generateJoinRecur(thisVar, join.slice(1), depth + 1, out)
          : generateUnifyStmt(outerVar, thisVar, innerLoop, bindingsVar),
    };
  } else {
    // generate if statement
    throw new Error("TODO: generate if statement for BinExpr");
  }
}

function generateUnifyStmt(
  left: string,
  right: string,
  inner: Statement,
  bindingsVar: string
): Statement {
  const unifyCall: CallExpression = {
    type: "CallExpression",
    callee: { type: "Identifier", name: "unify" },
    arguments: [
      { type: "ObjectExpression", properties: [] },
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
        id: { type: "Identifier", name: bindingsVar },
        init: unifyCall,
      },
    ],
  };
  const test: Expression = {
    type: "BinaryExpression",
    left: { type: "Identifier", name: bindingsVar },
    operator: "!==",
    right: { type: "Identifier", name: "null" },
  };
  return {
    type: "BlockStatement",
    body: [unifyAssnStmt, { type: "IfStatement", test, consequent: inner }],
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
