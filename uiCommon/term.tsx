import React from "react";
import { TermWithBindings, VarMappings } from "../types";
import { intersperse, mapObjToList } from "../util";
import { escapeString } from "../pretty";

export type Highlight =
  | { type: "Relation"; name: string }
  | { type: "Binding"; name: string } // TODO: need to scope this to a "rule path"
  | { type: "None" };

export const noHighlight: Highlight = { type: "None" };

export type HighlightProps = {
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
};

export function Term(props: {
  term: TermWithBindings;
  highlight: HighlightProps;
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
                    />
                    @
                  </>
                ) : null}
                <Term
                  term={valueWithBinding.term}
                  highlight={props.highlight}
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
              <Term term={item} highlight={props.highlight} />
            ))
          )}
          ]
        </>
      );
    case "BinExprWithBindings":
      return (
        <>
          <Term term={term.left} highlight={props.highlight} /> {term.op}{" "}
          <Term term={term.right} highlight={props.highlight} />
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

export function VarC(props: { name: string; highlight: HighlightProps }) {
  const hl = props.highlight.highlight;
  const isHighlighted = hl.type === "Binding" && hl.name === name;
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
        })
      }
      onMouseOut={() => props.highlight.setHighlight(noHighlight)}
    >
      {props.name}
    </span>
  );
}
