import React from "react";
import {
  TermWithBindings,
  ScopePath,
  scopePathEq,
  SituatedBinding,
} from "../types";
import { intersperse, mapObjToList } from "../util";
import { escapeString } from "../pretty";

export type Highlight =
  | { type: "Relation"; name: string }
  | { type: "Binding"; binding: SituatedBinding } // TODO: need to scope this to a "rule path"
  | { type: "None" };

export const noHighlight: Highlight = { type: "None" };

export type HighlightProps = {
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
  childPaths: SituatedBinding[];
};

export function Term(props: {
  term: TermWithBindings;
  highlight: HighlightProps;
  scopePath: ScopePath;
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
                      scopePath={props.scopePath}
                    />
                    @
                  </>
                ) : null}
                <Term
                  term={valueWithBinding.term}
                  highlight={props.highlight}
                  scopePath={props.scopePath}
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
                scopePath={props.scopePath}
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
            scopePath={props.scopePath}
          />{" "}
          {term.op}{" "}
          <Term
            term={term.right}
            highlight={props.highlight}
            scopePath={props.scopePath}
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
  scopePath: ScopePath;
  highlight: HighlightProps;
}) {
  const status = highlightStatus(props.highlight, props.scopePath, props.name);
  return (
    <span
      className="binding-name"
      style={{
        color: "orange",
        backgroundColor: colorForStatus(status),
      }}
      onMouseOver={() =>
        props.highlight.setHighlight({
          type: "Binding",
          binding: { name: props.name, path: props.scopePath },
        })
      }
      onMouseOut={() => props.highlight.setHighlight(noHighlight)}
    >
      {props.name}
    </span>
  );
}

function colorForStatus(s: HighlightStatus): string {
  switch (s) {
    case "parent":
      return "lightblue";
    case "hover":
      return "lightpink";
    case "child":
      return "lightgrey";
    case "none":
      return "";
  }
}

type HighlightStatus = "parent" | "hover" | "child" | "none";

function highlightStatus(
  highlight: HighlightProps,
  path: ScopePath,
  name: string
): HighlightStatus {
  // TODO: factor out bindingEq function or something
  const hl = highlight.highlight;
  if (hl.type !== "Binding") {
    return "none";
  }
  if (name === hl.binding.name && scopePathEq(path, hl.binding.path)) {
    return "hover";
  }
  if (
    highlight.childPaths.some(
      (childPath) =>
        name === childPath.name && scopePathEq(childPath.path, path)
    )
  ) {
    return "child";
  }
  // TODO: parent
  return "none";
}
