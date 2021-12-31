import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import Editor from "../editor";
import { highlight } from "../highlight";
import Parsimmon from "parsimmon";
import { insertSuggestionAction, Suggestion } from "../suggestions";
import { Rec, Term } from "../../../core/types";
import { clamp, mapObjToList } from "../../../util/util";
import { getTypeErrors, DLTypeError } from "../errors";
import { EditorState, EditorAction, ActionContext } from "../types";
import {
  keyMap,
  KEY_DOWN_ARROW,
  KEY_UP_ARROW,
  KEY_ENTER,
  KEY_A,
  KEY_Z,
} from "../keymap";
import { KeyBindingsTable, SuggestionsList } from "../editorCommon";

type EvalError =
  | { type: "ParseError"; expected: string[]; offset: number }
  | { type: "EvalError"; err: EvalError };

export function loadInterpreter<AST>(
  initialInterp: AbstractInterpreter,
  state: EditorState,
  parse: Parsimmon.Parser<AST>,
  flatten: (t: AST) => Term[]
): { interp: AbstractInterpreter; error: EvalError | null } {
  let interp = initialInterp;
  let error: EvalError | null = null;

  interp = interp.evalStr(`ide.Cursor{idx: ${state.cursorPos}}.`)[1];

  const parseRes = parse.parse(state.source);
  if (parseRes.status === false) {
    error = {
      type: "ParseError",
      expected: parseRes.expected,
      offset: parseRes.index.offset,
    };
  } else {
    try {
      const flattened = flatten(parseRes.value);
      interp = flattened.reduce<AbstractInterpreter>(
        (curInterp, rec) => curInterp.insert(rec as Rec),
        interp
      );
    } catch (e) {
      error = { type: "EvalError", err: e };
      console.error("eval error", error.err);
    }
  }

  return { interp, error };
}

export function CodeEditor(props: {
  interp: AbstractInterpreter;
  getSuggestions: (interp: AbstractInterpreter) => Suggestion[];
  highlightCSS: string;
  state: EditorState;
  setState: (st: EditorState) => void;
  loadError: EvalError | null;
}) {
  const st = props.state;
  const setCursorPos = (pos: number) => {
    return props.setState({
      ...st,
      cursorPos: pos,
    });
  };

  let evalError: EvalError | null = null;
  let suggestions: Suggestion[] = [];
  let typeErrors: DLTypeError[] = [];
  try {
    // get suggestions
    suggestions = props.getSuggestions(props.interp);
    typeErrors = getTypeErrors(props.interp);
  } catch (e) {
    evalError = { type: "EvalError", err: e };
    console.error("eval error", evalError.err);
  }

  if (typeErrors.length > 0) {
    console.log("type errors", typeErrors);
  }
  const locatedErrors: { offset: number }[] = [
    ...typeErrors.map((e) => ({ offset: e.span.from })),
    ...(props.loadError && props.loadError.type === "ParseError"
      ? [{ offset: props.loadError.offset }]
      : []),
  ];

  const haveSuggestions = suggestions.length > 0;
  const clampSuggIdx = (n: number) => clamp(n, [0, suggestions.length - 1]);
  const actionCtx = {
    interp: props.interp,
    state: st,
    suggestions,
    errors: locatedErrors,
  };
  const applyAction = (action: EditorAction) => {
    if (action.available(actionCtx)) {
      props.setState(action.apply(actionCtx));
    }
  };
  const errorsToDisplay = [evalError, props.loadError].filter(
    (x) => x !== null
  );

  return (
    <div>
      <style>{props.highlightCSS}</style>
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
              props.interp,
              props.state.source,
              props.loadError && props.loadError.type === "ParseError"
                ? props.loadError.offset
                : null,
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
        <KeyBindingsTable actionCtx={actionCtx} />
        <div>
          <SuggestionsList
            suggestions={suggestions}
            applyAction={applyAction}
            editorState={st}
          />
        </div>
      </div>
      <div style={{ fontFamily: "monospace", color: "red" }}>
        <ul>
          {errorsToDisplay.map((err, idx) => (
            <li key={idx}>
              {err.type === "ParseError"
                ? `Parse error: expected ${err.expected.join(" or ")}`
                : `Eval error: ${err.err}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
