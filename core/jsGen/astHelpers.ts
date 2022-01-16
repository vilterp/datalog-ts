import {
  CallExpression,
  Expression,
  MemberExpression,
  Node,
  ObjectExpression,
} from "estree";

export function jsIdent(name: string): Expression {
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

export function jsString(value: string): Expression {
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
