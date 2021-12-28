import React from "react";
import {
  TermWithBindings,
  ScopePath,
  scopePathEq,
  SituatedBinding,
  Term,
} from "../../core/types";
import { intersperse, mapObjToList } from "../../util/util";
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
};

export type HighlightProps = {
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
  childPaths: SituatedBinding[];
  parentPaths: SituatedBinding[];
};

export function TermView(props: {
  term: TermWithBindings;
  highlight: HighlightProps;
  scopePath: ScopePath;
}) {
  const inner = props.term.term;
  const innerView = (() => {
    switch (inner.type) {
      case "RecordWithBindings": {
        const hl = props.highlight.highlight;
        const isHighlighted =
          hl.type === "Relation" && hl.name === inner.relation;
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
                  name: inner.relation,
                })
              }
              onMouseOut={() => props.highlight.setHighlight(noHighlight)}
            >
              {inner.relation}
            </span>
            {"{"}
            {intersperse<React.ReactNode>(
              ", ",
              mapObjToList(inner.attrs, (key, valueWithBinding) => (
                <React.Fragment key={key}>
                  {key}:{" "}
                  <TermView
                    term={valueWithBinding}
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
              inner.items.map((item, idx) => (
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
              term={inner.left}
              highlight={props.highlight}
              scopePath={props.scopePath}
            />{" "}
            {inner.op}{" "}
            <TermView
              term={inner.right}
              highlight={props.highlight}
              scopePath={props.scopePath}
            />
          </>
        );
      case "Atom":
        const t = inner.term;
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
  })();
  return (
    <>
      {props.term.binding ? (
        <>
          <VarC
            name={props.term.binding}
            highlight={props.highlight}
            scopePath={props.scopePath}
          />
          @
        </>
      ) : null}
      {innerView}
    </>
  );
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
