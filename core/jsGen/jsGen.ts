import { generate } from "astring";
import {
  CallExpression,
  Expression,
  FunctionDeclaration,
  Node,
  Statement,
} from "estree";
import { mapObj } from "../../util/util";
import { AndClause, Rec, Rule, Term } from "../types";
import {
  jsBinExpr,
  jsBlock,
  jsCall,
  jsChain,
  jsConstAssn,
  jsConstInit,
  jsContinue,
  jsIdent,
  jsIf,
  jsLogVar,
  jsNull,
  jsObj,
  jsString as jsStr,
} from "./astHelpers";

const OUT_VAR = "out";

export function prettyPrintJS(node: Node): string {
  return generate(node);
}

export function generateRule(rule: Rule): FunctionDeclaration {
  const initOut = jsConstAssn(OUT_VAR, {
    type: "ArrayExpression",
    elements: [],
  });
  const returnOut: Node = {
    type: "ReturnStatement",
    argument: { type: "Identifier", name: OUT_VAR },
  };

  const joins = rule.body.opts.map((andExpr) =>
    generateJoin(andExpr.clauses, rule.head)
  );

  return {
    type: "FunctionDeclaration",
    id: jsIdent(rule.head.relation),
    params: [jsIdent("db")],
    body: {
      type: "BlockStatement",
      body: [initOut, ...joins, returnOut],
    },
  };
}

function generateJoin(join: AndClause[], out: Rec): Statement {
  return generateJoinRecur(join, 0, out);
}

function generateJoinRecur(
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
    const innerLoop = generateJoinRecur(join.slice(1), depth + 1, out);
    return {
      type: "ForOfStatement",
      await: false,
      left: jsConstInit(thisVar),
      right: jsChain(["db", "tables", clause.relation]),
      body: generateUnifyIfStmt(thisVar, clause, innerLoop, depth),
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
  varName: string,
  clause: Rec,
  inner: Statement,
  depth: number
): Statement {
  const thisBindingsVar = bindingsVar(depth);
  const outerBindings: Expression =
    depth === 0 ? jsObj({}) : jsIdent(bindingsVar(depth - 1));
  const unifyCall = jsCall(jsChain(["ctx", "unify"]), [
    jsObj({}),
    jsIdent(varName),
    generateTerm(clause),
  ]);
  const unifyAssnStmt = jsConstAssn(`match${depth}`, unifyCall);
  const combineAssnStmt = jsConstAssn(
    thisBindingsVar,
    jsCall(jsChain(["ctx", "unifyVars"]), [
      jsIdent(`match${depth}`),
      outerBindings,
    ])
  );
  const test: Expression = {
    type: "BinaryExpression",
    left: jsIdent(`match${depth}`),
    operator: "!==",
    right: jsIdent("null"),
  };
  return jsBlock([
    unifyAssnStmt,
    jsLogVar(`match${depth}`),
    jsIf(
      jsBinExpr(jsIdent(`match${depth}`), "===", jsNull),
      jsBlock([jsContinue])
    ),
    combineAssnStmt,
    jsLogVar(thisBindingsVar),
    jsIf(
      jsBinExpr(jsIdent(thisBindingsVar), "===", jsNull),
      jsBlock([jsContinue])
    ),
    inner,
  ]);
}

function generateSubstituteCall(
  bindings: Expression,
  rec: Expression
): Expression {
  return jsCall(jsChain(["ctx", "substitute"]), [rec, bindings]);
}

function generateTerm(term: Term): Expression {
  switch (term.type) {
    case "Record":
      return jsCall(jsChain(["ctx", "rec"]), [
        jsStr(term.relation),
        jsObj(mapObj(term.attrs, (attr, term) => generateTerm(term))),
      ]);
    case "Var":
      return jsCall(jsChain(["ctx", "varr"]), [jsStr(term.name)]);
  }
}
