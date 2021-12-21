import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import Editor from "../../uiCommon/ide/editor";
import { highlight } from "../../uiCommon/ide/highlight";

export function CodeEditor(props: {
  source: string;
  onSourceChange: (s: string) => void;
  cursorPos: number;
  onCursorPosChange: (n: number) => void;
  interp: AbstractInterpreter;
  validGrammar: boolean;
}) {
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
        highlight={(_) =>
          props.validGrammar
            ? highlight(props.interp, props.source, 0, [])
            : props.source
        }
        cursorPos={props.cursorPos}
        onKeyUp={(evt) =>
          props.onCursorPosChange(evt.currentTarget.selectionStart)
        }
        onClick={(evt) =>
          props.onCursorPosChange(evt.currentTarget.selectionStart)
        }
      />
      {/* TODO: make this editable at runtime */}
      <style>{`
          .segment-ident {
              color: purple;
          }
          .segment-var {
              color: orange;
          }
          .segment-int {
              color: blue;
          }
          .segment-string {
              color: green;
          }
      `}</style>
    </>
  );
}
