import React from "react";
import {
  evalStr,
  Interpreter,
  processStmt,
} from "../../incremental/interpreter";
import Editor from "./editor";
import { highlight } from "./highlight";
import Parsimmon from "parsimmon";
import { insertSuggestionAction, Suggestion } from "./suggestions";
import { Rec, Term } from "../../types";
import { clamp, mapObjToList } from "../../util";
import { getTypeErrors, DLTypeError } from "./errors";
import { EditorState, EditorAction, ActionContext } from "./types";
import {
  keyMap,
  KEY_DOWN_ARROW,
  KEY_UP_ARROW,
  KEY_ENTER,
  KEY_A,
  KEY_Z,
} from "./keymap";

type Error =
  | { type: "ParseError"; expected: string[]; offset: number }
  | { type: "EvalError"; err: Error };

export function CodeEditor<AST>(props: {
  parse: Parsimmon.Parser<AST>;
  flatten: (t: AST) => Term[];
  interp: Interpreter;
  getSuggestions: (interp: Interpreter) => Suggestion[];
  highlightCSS: string;
  state: EditorState;
  setState: (st: EditorState) => void;
}): [Interpreter, React.ReactNode] {
  const interp2 = evalStr(
    props.interp,
    `ide.Cursor{idx: ${props.state.cursorPos}}.`
  );

  const st = props.state;
  const setCursorPos = (pos: number) => {
    return props.setState({
      ...st,
      cursorPos: pos,
    });
  };

  let error: Error | null = null;
  let suggestions: Suggestion[] = [];
  let typeErrors: DLTypeError[] = [];
  const parseRes = props.parse.parse(st.source);
  let interp3: Interpreter = null;
  if (parseRes.status === false) {
    error = {
      type: "ParseError",
      expected: parseRes.expected,
      offset: parseRes.index.offset,
    };
    interp3 = interp2;
  } else {
    try {
      const flattened = props.flatten(parseRes.value);
      interp3 = flattened.reduce<Interpreter>(
        (int, rec) =>
          processStmt(int, { type: "Insert", record: rec as Rec }).newInterp,
        interp2
      );

      // get suggestions
      suggestions = props.getSuggestions(interp3);
      typeErrors = getTypeErrors(interp3);
    } catch (e) {
      error = { type: "EvalError", err: e };
      console.error("eval error", error.err);
    }
  }

  if (typeErrors.length > 0) {
    console.log("type errors", typeErrors);
  }
  const errors: { offset: number }[] = [
    ...typeErrors.map((e) => ({ offset: e.span.from })),
    ...(error && error.type === "ParseError" ? [{ offset: error.offset }] : []),
  ];

  const haveSuggestions = suggestions.length > 0;
  const clampSuggIdx = (n: number) => clamp(n, [0, suggestions.length - 1]);
  const applyAction = (action: EditorAction, modifiedState?: EditorState) => {
    const ctx: ActionContext = {
      interp: interp3,
      state: modifiedState ? modifiedState : st,
      suggestions,
      errors,
    };
    if (action.available(ctx)) {
      props.setState(action.apply(ctx));
    }
  };
  const actionCtx = {
    interp: interp3,
    state: st,
    suggestions,
    errors,
  };

  return [
    interp3,
    <div>
      <style
        dangerouslySetInnerHTML={{
          __html: props.highlightCSS,
        }}
      />
      <div style={{ display: "flex" }}>
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
          autoFocus={true}
          padding={10}
          value={st.source}
          onValueChange={(source) => props.setState({ ...st, source })}
          cursorPos={st.cursorPos} // would be nice if we could have an onCursorPos
          highlight={(_) =>
            highlight(
              interp3,
              props.state.source,
              error && error.type === "ParseError" ? error.offset : null,
              typeErrors
            )
          }
          onKeyDown={(evt) => {
            if (haveSuggestions) {
              switch (evt.keyCode) {
                case KEY_DOWN_ARROW:
                  evt.preventDefault();
                  props.setState({
                    ...props.state,
                    selectedSuggIdx: clampSuggIdx(
                      props.state.selectedSuggIdx + 1
                    ),
                  });
                  return;
                case KEY_UP_ARROW:
                  if (st.selectedSuggIdx > 0) {
                    evt.preventDefault();
                    props.setState({
                      ...st,
                      selectedSuggIdx: clampSuggIdx(st.selectedSuggIdx - 1),
                    });
                    return;
                  }
                  return;
                case KEY_ENTER:
                  evt.preventDefault();
                  applyAction(insertSuggestionAction);
                  return;
              }
            }
            if (evt.metaKey) {
              if (KEY_A <= evt.keyCode && evt.keyCode <= KEY_Z) {
                const action = keyMap[evt.key];
                if (!action) {
                  return;
                }
                applyAction(action);
                return;
              }
            }
          }}
          onKeyUp={(evt) => setCursorPos(evt.currentTarget.selectionStart)}
          onClick={(evt) => setCursorPos(evt.currentTarget.selectionStart)}
        />
        <table>
          <tbody>
            {mapObjToList(keyMap, (key, action) => (
              <tr
                key={action.name}
                style={{
                  color: action.available(actionCtx) ? "black" : "lightgrey",
                }}
              >
                <td>⌘{key.toUpperCase()}</td>
                <td>{action.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily: "monospace", color: "red" }}>
        {!error ? (
          <>&nbsp;</>
        ) : error.type === "ParseError" ? (
          `Parse error: expected ${error.expected.join(" or ")}`
        ) : (
          `Eval error: ${error.err}`
        )}
      </div>
      {suggestions ? (
        <ul style={{ fontFamily: "monospace" }}>
          {suggestions.map((sugg, idx) => (
            <li
              key={JSON.stringify(sugg)}
              style={{
                cursor: "pointer",
                fontWeight: sugg.bold ? "bold" : "normal",
                textDecoration:
                  st.selectedSuggIdx === idx ? "underline" : "none",
              }}
              onClick={() => {
                applyAction(insertSuggestionAction, {
                  ...st,
                  selectedSuggIdx: idx,
                });
              }}
            >
              {sugg.display ? sugg.display : sugg.textToInsert}: {sugg.kind}
            </li>
          ))}
        </ul>
      ) : null}
    </div>,
  ];
}
