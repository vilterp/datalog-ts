import React from "react";
import {
  TermWithBindings,
  ScopePath,
  scopePathEq,
  SituatedBinding,
  Term,
} from "../../core/types";
import {
  intersperse,
  mapObjToList,
  mapObjToListUnordered,
} from "../../util/util";
import { escapeString } from "../../core/pretty";

export type Highlight =
  | { type: "Relation"; name: string }
  | { type: "Binding"; binding: SituatedBinding } // TODO: need to scope this to a "rule path"
  | { type: "Term"; term: Term }
  | { type: "None" };

export const noHighlight: Highlight = { type: "None" };

export const noHighlightProps: HighlightProps = {
  highlight: noHighlight,
  setHighlight: () => {},
  parentPaths: [],
  childPaths: [],
  onClickRelation: () => {},
};

export type HighlightProps = {
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
  childPaths: SituatedBinding[];
  parentPaths: SituatedBinding[];
  onClickRelation?: (name: string) => void;
};

export function TermView(props: {
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
              cursor: props.highlight.onClickRelation ? "pointer" : "inherit",
            }}
            onMouseOver={() =>
              props.highlight.setHighlight({
                type: "Relation",
                name: term.relation,
              })
            }
            onMouseOut={() => props.highlight.setHighlight(noHighlight)}
            onClick={() =>
              props.highlight.onClickRelation
                ? props.highlight.onClickRelation(term.relation)
                : null
            }
          >
            {term.relation}
          </span>
          {"{"}
          {intersperse<React.ReactNode>(
            ", ",
            mapObjToListUnordered(term.attrs, (key, valueWithBinding) => (
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
                <TermView
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
            term.items.map((item, idx) => (
              <TermView
                key={idx}
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
          <TermView
            term={term.left}
            highlight={props.highlight}
            scopePath={props.scopePath}
          />{" "}
          {term.op}{" "}
          <TermView
            term={term.right}
            highlight={props.highlight}
            scopePath={props.scopePath}
          />
        </>
      );
    case "NegationWithBindings":
      return (
        <>
          !
          <TermView
            highlight={props.highlight}
            scopePath={props.scopePath}
            term={term.inner}
          />
        </>
      );
    case "AggregationWithBindings":
      return (
        <>
          <span style={{ color: "purple" }}>{term.aggregation}</span>[
          {intersperse(
            <>, </>,
            term.varNames.map((varName, idx) => (
              <span key={idx} style={{ color: "darkorange" }}>
                {varName}
              </span>
            ))
          )}
          :{" "}
          <TermView
            term={term.record}
            highlight={props.highlight}
            scopePath={props.scopePath}
          />
          ]
        </>
      );
    case "DictWithBindings":
      return (
        <>
          {"{"}
          {intersperse(
            <>, </>,
            mapObjToList(term.map, (key, val) => (
              <React.Fragment key={key}>
                <span style={{ color: "green" }}>"{escapeString(key)}"</span>
                :&nbsp;
                <TermView
                  term={val}
                  highlight={props.highlight}
                  scopePath={props.scopePath}
                />
              </React.Fragment>
            ))
          )}
          {"}"}
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
          return <span style={{ color: "darkorange" }}>{`${t.name}`}</span>;
      }
  }
}

export function VarC(props: {
  name: string;
  scopePath: ScopePath;
  highlight: HighlightProps;
}) {
  const status = highlightStatus(props.highlight, props.scopePath, props.name);
  const { background, letter } = colorForStatus(status);
  return (
    <span
      className="binding-name"
      style={{
        color: letter,
        backgroundColor: background,
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

function colorForStatus(s: HighlightStatus): {
  background: string;
  letter: string;
} {
  switch (s) {
    case "parent":
      return { background: "plum", letter: "white" };
    case "hover":
      return { background: "lightpink", letter: "white" };
    case "child":
      return { background: "lightgrey", letter: "orange" };
    case "none":
      return { background: "", letter: "orange" };
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
  if (
    highlight.parentPaths.some(
      (praentPath) =>
        name === praentPath.name && scopePathEq(praentPath.path, path)
    )
  ) {
    return "parent";
  }
  return "none";
}
