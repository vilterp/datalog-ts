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
  doc: MarkdownDoc;
  setDoc: (d: MarkdownDoc) => void;
}): { interp: Interpreter; view: React.ReactNode } {
  const res = (() => {
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
  })();
  return { interp: res.interp, view: <>{res.view}</> };
}

type Ctx = { interp: Interpreter; rendered: React.ReactNode[] };

function EditorSwitcher(props: {
  idx: number;
  view: React.ReactNode;
  doc: MarkdownDoc;
  setDoc: (d: MarkdownDoc) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{ display: "flex" }}>
      <div>
        <button
          className="form-control"
          onClick={() => {
            props.setDoc(removeAt(props.doc, props.idx));
          }}
        >
          Remove
        </button>
        <button className="form-control" onClick={() => setEditing(!editing)}>
          Edit
        </button>
      </div>
      <div>
        <p>Editing: {`${editing}`}</p>
        {props.view}
        <AddCellButton
          doc={props.doc}
          setDoc={props.setDoc}
          insertAt={props.idx}
        />
      </div>
    </div>
  );
}

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
        doc: props.doc,
        setDoc: props.setDoc,
      });
      return { interp: newInterp, rendered: [...ctx.rendered, view] };
    },
    { interp, rendered: [] }
  );
  return (
    <>
      {ctx.rendered.map((r, idx) => (
        <EditorSwitcher
          key={idx}
          view={r}
          idx={idx}
          doc={props.doc}
          setDoc={props.setDoc}
        />
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
