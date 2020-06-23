import React, { useState } from "react";
import { ReplCore } from "../../replCore";
import Editor from "react-simple-code-editor/src";
import { highlight } from "./highlight";
import Parsimmon from "parsimmon";
import {
  Suggestion,
  getSuggestions,
  typeToString,
  insertSuggestion,
} from "./suggestions";
import { Rec, Term } from "../../types";
import { clamp } from "../../util";

type Error =
  | { type: "ParseError"; expected: string[]; offset: number }
  | { type: "EvalError"; err: Error };

const KEY_DOWN_ARROW = 40;
const KEY_UP_ARROW = 38;
const KEY_ENTER = 13;

export function CodeEditor<T>(props: {
  parse: Parsimmon.Parser<T>;
  flatten: (t: T) => Term[];
  repl: ReplCore; // pre-loaded with rules
  source: string;
  setSource: (source: string) => void;
  cursorPos: number;
  setCursorPos: (n: number) => void;
  highlightCSS: string;
  selectedSugg: number;
  setSelectedSugg: (n: number) => void;
}) {
  // TODO: make REPL immutable; always start from one with this stuff loaded
  let error: Error | null = null;
  let suggestions: Suggestion[] = [];
  const parseRes = props.parse.parse(props.source);
  if (parseRes.status === false) {
    error = {
      type: "ParseError",
      expected: parseRes.expected,
      offset: parseRes.index.offset,
    };
  } else {
    try {
      const flattened = props.flatten(parseRes.value);
      flattened.forEach((rec) =>
        props.repl.evalStmt({ type: "Insert", record: rec as Rec })
      );

      // get suggestions
      suggestions = getSuggestions(props.repl);
    } catch (e) {
      error = { type: "EvalError", err: e };
    }
  }

  const haveSuggestions = suggestions.length > 0;
  const clampSuggIdx = (n: number) => clamp(n, [0, suggestions.length - 1]);

  return (
    <div style={{ display: "flex" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: props.highlightCSS,
        }}
      />
      <Editor
        name="wut" // type error without this, even tho optional
        style={{
          fontFamily: "monospace",
          height: 150,
          width: 500,
          backgroundColor: "rgb(250, 250, 250)",
          border: "1px solid black",
          marginBottom: 10,
        }}
        padding={10}
        value={props.source}
        onValueChange={props.setSource}
        highlight={(_) =>
          highlight(
            props.repl,
            props.source,
            error && error.type === "ParseError" ? error.offset : null
          )
        }
        onKeyDown={(evt) => {
          if (haveSuggestions) {
            switch (evt.keyCode) {
              case KEY_DOWN_ARROW:
                evt.preventDefault();
                props.setSelectedSugg(clampSuggIdx(props.selectedSugg + 1));
                return;
              case KEY_UP_ARROW:
                evt.preventDefault();
                props.setSelectedSugg(clampSuggIdx(props.selectedSugg - 1));
                return;
              case KEY_ENTER:
                evt.preventDefault();
                props.setSource(
                  insertSuggestion(
                    props.repl,
                    props.source,
                    suggestions[props.selectedSugg]
                  )
                );
                return;
            }
          }
          props.setCursorPos(evt.currentTarget.selectionStart);
        }}
        onKeyUp={(evt) => {
          props.setCursorPos(evt.currentTarget.selectionStart);
        }}
        onClick={(evt) => {
          props.setCursorPos(evt.currentTarget.selectionStart);
        }}
      />

      {error ? (
        <div style={{ fontFamily: "monospace", marginLeft: 15, color: "red" }}>
          {error.type === "ParseError"
            ? `Parse error: expected ${error.expected.join(" or ")}`
            : `Eval error: ${error.err}`}
        </div>
      ) : null}
      <p>sugg: {props.selectedSugg}</p>
      {suggestions ? (
        <ul style={{ fontFamily: "monospace" }}>
          {suggestions.map((sugg, idx) => (
            <li
              key={JSON.stringify(sugg)}
              style={{
                cursor: "pointer",
                fontWeight: sugg.typeMatch ? "bold" : "normal",
                textDecoration:
                  props.selectedSugg === idx ? "underline" : "none",
              }}
              onClick={() =>
                props.setSource(
                  insertSuggestion(props.repl, props.source, sugg)
                )
              }
            >
              {sugg.name}: {typeToString(sugg.type)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
