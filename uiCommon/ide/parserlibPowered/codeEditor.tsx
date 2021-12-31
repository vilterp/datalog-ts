import React from "react";
import { AbstractInterpreter } from "../../../core/abstractInterpreter";
import Editor from "../editor";
import { KeyBindingsTable } from "../editorCommon";
import { highlight } from "../highlight";

export function CodeEditor(props: {
  source: string;
  onSourceChange: (s: string) => void;
  cursorPos: number;
  onCursorPosChange: (n: number) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
}) {
  let highlighted: React.ReactNode = <>{props.source}</>;
  let error = null;
  if (props.validGrammar) {
    try {
      highlighted = highlight(props.interp, props.source, 0, []);
    } catch (e) {
      error = e.toString();
    }
  }

  return (
    <>
      <Editor
        style={{
          fontFamily: "monospace",
          width: 300,
          height: 200,
          border: "1px solid black",
        }}
        padding={5}
        value={props.source}
        onValueChange={(source) => props.onSourceChange(source)}
        highlight={(_) => highlighted}
        cursorPos={props.cursorPos}
        onKeyUp={(evt) =>
          props.onCursorPosChange(evt.currentTarget.selectionStart)
        }
        onClick={(evt) =>
          props.onCursorPosChange(evt.currentTarget.selectionStart)
        }
      />
      {error ? (
        <pre style={{ color: "red", fontFamily: "monospace" }}>{error}</pre>
      ) : null}
    </>
  );
}
