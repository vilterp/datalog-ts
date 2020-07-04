import React, { useState } from "react";
import { MarkdownDoc, MarkdownNode } from "./markdown";
import { Interpreter } from "../interpreter";
import { Program, Res } from "../types";
import { language } from "../parser";
import { IndependentTraceView } from "../uiCommon/replViews";

export function Editor(props: { doc: MarkdownDoc }) {
  const [doc, setDoc] = useState<MarkdownDoc>(props.doc);

  return (
    <>
      <Blocks doc={doc} setDoc={setDoc} />
      <button
        className="form-control"
        onClick={(evt) => {
          setDoc([
            ...doc,
            {
              type: "paragraph",
              content: [{ type: "text", content: "new cell" }],
            },
          ]);
        }}
      >
        Add cell
      </button>
    </>
  );
}

function CodeBlock(props: {
  code: string;
  interp: Interpreter;
}): { interp: Interpreter; rendered: React.ReactNode } {
  const program: Program = language.program.tryParse(props.code);
  const newInterpAndResults = program.reduce<{
    interp: Interpreter;
    results: Res[][];
  }>(
    (accum, stmt) => {
      const [res, newInterp] = accum.interp.evalStmt(stmt);
      return {
        interp: newInterp,
        results: [...accum.results, res.results],
      };
    },
    { interp: props.interp, results: [] }
  );
  return {
    interp: newInterpAndResults.interp,
    rendered: (
      <>
        <pre>{props.code}</pre>
        <div className="results">
          <ul>
            {flatten(newInterpAndResults.results).map((res, idx) => (
              <IndependentTraceView key={idx} res={res} />
            ))}
          </ul>
        </div>
      </>
    ),
  };
}

type Ctx = { interp: Interpreter; rendered: React.ReactNode[] };

function Blocks(props: {
  doc: MarkdownDoc;
  setDoc: (doc: MarkdownDoc) => void;
}) {
  const interp = new Interpreter(".", null);

  const ctx = props.doc.reduce<Ctx>(
    (ctx, node): Ctx => {
      switch (node.type) {
        case "codeBlock":
          const { interp: newInterp, rendered } = CodeBlock({
            interp: ctx.interp,
            code: node.content,
          });
          return {
            interp: newInterp,
            rendered: [...ctx.rendered, rendered],
          };
        default:
          return {
            interp: ctx.interp,
            rendered: [...ctx.rendered, <MarkdownNode block={node} />],
          };
      }
    },
    { interp, rendered: [] }
  );
  return (
    <>
      {ctx.rendered.map((r, idx) => (
        <React.Fragment key={idx}>{r}</React.Fragment>
      ))}
    </>
  );
}

function flatten(results: Res[][]): Res[] {
  const out: Res[] = [];
  results.forEach((resGroup) => {
    resGroup.forEach((res) => {
      out.push(res);
    });
  });
  return out;
}
