import React, { useState } from "react";
import { MarkdownDoc, MarkdownNode } from "./markdown";
import { Interpreter } from "../interpreter";
import { Program, Res } from "../types";
import { language } from "../parser";
import { IndependentTraceView } from "../uiCommon/replViews";
import { insertAt, removeAt } from "../util";

export function Editor(props: { doc: MarkdownDoc }) {
  const [doc, setDoc] = useState<MarkdownDoc>(props.doc);

  return (
    <>
      <Blocks doc={doc} setDoc={setDoc} />
      {doc.length === 0 ? (
        <AddCellButton doc={props.doc} setDoc={setDoc} insertAt={0} />
      ) : null}
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

function Cell(props: {
  block: MarkdownNode;
  interp: Interpreter;
}): { interp: Interpreter; view: React.ReactNode } {
  switch (props.block.type) {
    case "codeBlock":
      const { interp: newInterp, rendered } = CodeBlock({
        interp: props.interp,
        code: props.block.content,
      });
      return {
        interp: newInterp,
        view: rendered,
      };
    default:
      return {
        interp: props.interp,
        view: <MarkdownNode block={props.block} />,
      };
  }
}

type Ctx = { interp: Interpreter; rendered: React.ReactNode[] };

function Blocks(props: {
  doc: MarkdownDoc;
  setDoc: (doc: MarkdownDoc) => void;
}) {
  const interp = new Interpreter(".", null);

  const ctx = props.doc.reduce<Ctx>(
    (ctx, node): Ctx => {
      const { interp: newInterp, view } = Cell({
        block: node,
        interp: ctx.interp,
      });
      return { interp: newInterp, rendered: [...ctx.rendered, view] };
    },
    { interp, rendered: [] }
  );
  return (
    <>
      {ctx.rendered.map((r, idx) => (
        <div key={idx} style={{ display: "flex" }}>
          <div>
            <button
              className="form-control"
              onClick={() => {
                props.setDoc(removeAt(props.doc, idx));
              }}
            >
              Remove
            </button>
          </div>
          <div>
            {r}
            <AddCellButton
              doc={props.doc}
              setDoc={props.setDoc}
              insertAt={idx}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function AddCellButton(props: {
  doc: MarkdownDoc;
  setDoc: (doc: MarkdownDoc) => void;
  insertAt: number;
}) {
  return (
    <button
      className="form-control"
      onClick={() => {
        props.setDoc(
          insertAt(props.doc, props.insertAt, {
            type: "paragraph",
            content: [{ type: "text", content: "new cell" }],
          })
        );
      }}
    >
      Add cell
    </button>
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
