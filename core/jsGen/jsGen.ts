import { generate } from "astring";
import {
  CallExpression,
  Expression,
  FunctionDeclaration,
  Node,
  Statement,
} from "estree";
import { flatMap } from "../../util/util";
import { AndClause, AndExpr, Rule } from "../types";

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
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      left: { type: "Identifier", name: OUT_VAR },
      operator: "=",
      right: { type: "ArrayExpression", elements: [] },
    },
  };
  const returnOut: Node = {
    type: "ReturnStatement",
    argument: { type: "Identifier", name: OUT_VAR },
  };

  const joins = rule.body.opts.map((andExpr) => generateJoin(andExpr.clauses));

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

function generateJoin(join: AndClause[]): Statement {
  return generateJoinRecur(null, join);
}

function generateJoinRecur(
  outerVar: string | null,
  join: AndClause[]
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
        arguments: [{ type: "Identifier", name: "foo" }], // TODO: what do we push?
        optional: false,
      },
    };
  }
  const clause = join[0];
  const innerLoop = generateJoin(join.slice(1));
  if (clause.type === "Record") {
    const thisVar = `${clause.relation}_item`;
    return {
      type: "ForOfStatement",
      await: false,
      left: { type: "Identifier", name: thisVar },
      right: { type: "Identifier", name: clause.relation },
      body:
        outerVar === null
          ? generateJoinRecur(thisVar, join.slice(1))
          : generateUnifyStmt(outerVar, thisVar, innerLoop),
    };
  } else {
    // generate if statement
    throw new Error("TODO: generate if statement for BinExpr");
  }
}

function generateUnifyStmt(
  left: string,
  right: string,
  inner: Statement
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
    type: "ExpressionStatement",
    expression: {
      type: "AssignmentExpression",
      left: { type: "Identifier", name: "unifyRes" },
      operator: "=",
      right: unifyCall,
    },
  };
  const test: Expression = {
    type: "BinaryExpression",
    left: { type: "Identifier", name: "unifyRes" },
    operator: "!==",
    right: { type: "Identifier", name: "null" },
  };
  return {
    type: "BlockStatement",
    body: [unifyAssnStmt, { type: "IfStatement", test, consequent: inner }],
  };
}
