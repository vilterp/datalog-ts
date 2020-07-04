import React, { useState } from "react";
import { MarkdownDoc, MarkdownNode } from "./markdown";
import { Interpreter } from "../interpreter";
import { Program, Res } from "../types";
import { language } from "../parser";
import { IndependentTraceView } from "../uiCommon/replViews";
import { insertAt, removeAt } from "../util";

type Block = MarkdownNode & { id: number };
type Doc = { blocks: Block[]; nextID: number };

export function Editor(props: { doc: Doc }) {
  const [doc, setDoc] = useState<Doc>(props.doc);

  return (
    <>
      <Blocks doc={doc} setDoc={setDoc} />
      {doc.blocks.length === 0 ? (
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
  doc: Doc;
  setDoc: (d: Doc) => void;
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

function EditorSwitcher(props: {
  idx: number;
  view: React.ReactNode;
  doc: Doc;
  setDoc: (d: Doc) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{ display: "flex" }}>
      <div>
        <button
          className="form-control"
          onClick={() => {
            props.setDoc({
              ...props.doc,
              blocks: removeAt(props.doc.blocks, props.idx),
            });
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

type Ctx = {
  interp: Interpreter;
  rendered: { node: React.ReactNode; id: number }[];
};

function Blocks(props: { doc: Doc; setDoc: (doc: Doc) => void }) {
  const interp = new Interpreter(".", null);

  const ctx = props.doc.blocks.reduce<Ctx>(
    (ctx, block): Ctx => {
      const { interp: newInterp, view } = Cell({
        block: block,
        interp: ctx.interp,
        doc: props.doc,
        setDoc: props.setDoc,
      });
      return {
        interp: newInterp,
        rendered: [...ctx.rendered, { node: view, id: block.id }],
      };
    },
    { interp, rendered: [] }
  );
  return (
    <>
      {ctx.rendered.map((r, idx) => (
        <EditorSwitcher
          key={r.id}
          view={r.node}
          idx={idx}
          doc={props.doc}
          setDoc={props.setDoc}
        />
      ))}
    </>
  );
}

function AddCellButton(props: {
  doc: Doc;
  setDoc: (doc: Doc) => void;
  insertAt: number;
}) {
  return (
    <button
      className="form-control"
      onClick={() => {
        props.setDoc({
          ...props.doc,
          nextID: props.doc.nextID + 1,
          blocks: insertAt(props.doc.blocks, props.insertAt, {
            type: "paragraph",
            content: [{ type: "text", content: "new cell" }],
            id: props.doc.nextID,
          }),
        });
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
