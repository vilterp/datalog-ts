import React from "react";
import { TermWithBindings } from "../types";
import { intersperse, mapObjToList, arrayEq } from "../util";
import { escapeString } from "../pretty";

export type RulePath = string[];

// gah this should be derived by the language
export function rulePathEq(left: RulePath, right: RulePath): boolean {
  return arrayEq(left, right, (a, b) => a === b);
}

export type Highlight =
  | { type: "Relation"; name: string }
  | { type: "Binding"; name: string; rulePath: RulePath } // TODO: need to scope this to a "rule path"
  | { type: "None" };

export const noHighlight: Highlight = { type: "None" };

export type HighlightProps = {
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
};

export function Term(props: {
  term: TermWithBindings;
  highlight: HighlightProps;
  rulePath: RulePath;
}) {
  const term = props.term;
  switch (term.type) {
    case "RecordWithBindings": {
      const hl = props.highlight.highlight;
      const isHighlighted = hl.type === "Relation" && hl.name === term.relation;
      return (
        <>
          <span
            className="relation-name"
            style={{
              color: "purple",
              backgroundColor: isHighlighted ? "lightgrey" : "",
            }}
            onMouseOver={() =>
              props.highlight.setHighlight({
                type: "Relation",
                name: term.relation,
              })
            }
            onMouseOut={() => props.highlight.setHighlight(noHighlight)}
          >
            {term.relation}
          </span>
          {"{"}
          {intersperse<React.ReactNode>(
            ", ",
            mapObjToList(term.attrs, (key, valueWithBinding) => (
              <React.Fragment key={key}>
                {key}:{" "}
                {valueWithBinding.binding ? (
                  <>
                    <VarC
                      name={valueWithBinding.binding}
                      highlight={props.highlight}
                      rulePath={props.rulePath}
                    />
                    @
                  </>
                ) : null}
                <Term
                  term={valueWithBinding.term}
                  highlight={props.highlight}
                  rulePath={props.rulePath}
                />
              </React.Fragment>
            ))
          )}
          {"}"}
        </>
      );
    }
    case "ArrayWithBindings":
      return (
        <>
          [
          {intersperse<React.ReactNode>(
            ", ",
            term.items.map((item) => (
              <Term
                term={item}
                highlight={props.highlight}
                rulePath={props.rulePath}
              />
            ))
          )}
          ]
        </>
      );
    case "BinExprWithBindings":
      return (
        <>
          <Term
            term={term.left}
            highlight={props.highlight}
            rulePath={props.rulePath}
          />{" "}
          {term.op}{" "}
          <Term
            term={term.right}
            highlight={props.highlight}
            rulePath={props.rulePath}
          />
        </>
      );
    case "Atom":
      const t = term.term;
      switch (t.type) {
        case "Bool":
        case "IntLit":
          return <span style={{ color: "blue" }}>{`${t.val}`}</span>;
        case "StringLit":
          return (
            <span style={{ color: "green" }}>"{escapeString(t.val)}"</span>
          );
        case "Var":
          return <span>{`${t.name}`}</span>;
      }
  }
}

export function VarC(props: {
  name: string;
  rulePath: RulePath;
  highlight: HighlightProps;
}) {
  const hl = props.highlight.highlight;
  const isHighlighted =
    hl.type === "Binding" &&
    hl.name === props.name &&
    rulePathEq(props.rulePath, hl.rulePath);
  return (
    <span
      className="binding-name"
      style={{
        color: "orange",
        backgroundColor: isHighlighted ? "lightgrey" : "",
      }}
      onMouseOver={() =>
        props.highlight.setHighlight({
          type: "Binding",
          name: props.name,
          rulePath: props.rulePath,
        })
      }
      onMouseOut={() => props.highlight.setHighlight(noHighlight)}
    >
      {props.name}
    </span>
  );
}
