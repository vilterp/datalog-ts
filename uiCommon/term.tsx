import React from "react";
import { TermWithBindings, VarMappings } from "../types";
import { intersperse, mapObjToList } from "../util";
import { escapeString } from "../pretty";

export type Highlight =
  | { type: "Relation"; name: string }
  | { type: "Binding"; name: string }
  | { type: "None" };

export const noHighlight: Highlight = { type: "None" };

export function Term(props: {
  term: TermWithBindings;
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
}) {
  const term = props.term;
  const highlightProps = {
    highlight: props.highlight,
    setHighlight: props.setHighlight,
  };
  switch (term.type) {
    case "RecordWithBindings":
      return (
        <>
          <span
            className="relation-name"
            style={{ fontWeight: "bold" }}
            onMouseOver={() =>
              props.setHighlight({ type: "Relation", name: term.relation })
            }
            onMouseOut={() => props.setHighlight(noHighlight)}
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
                    <VarC name={valueWithBinding.binding} {...highlightProps} />
                    @
                  </>
                ) : null}
                <Term term={valueWithBinding.term} {...highlightProps} />
              </React.Fragment>
            ))
          )}
          {"}"}
        </>
      );
    case "ArrayWithBindings":
      return (
        <>
          [
          {intersperse<React.ReactNode>(
            ", ",
            term.items.map((item) => <Term term={item} {...highlightProps} />)
          )}
          ]
        </>
      );
    case "BinExprWithBindings":
      return (
        <>
          <Term term={term.left} {...highlightProps} /> {term.op}{" "}
          <Term term={term.right} {...highlightProps} />
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
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
}) {
  return (
    <span
      className="binding-name"
      style={{ color: "orange" }}
      onMouseOver={() =>
        props.setHighlight({
          type: "Binding",
          name: props.name,
        })
      }
      onMouseOut={() => props.setHighlight(noHighlight)}
    >
      {props.name}
    </span>
  );
}
