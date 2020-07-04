import React, { useState } from "react";
import { MarkdownDoc, MarkdownNode } from "./markdown";
import { Interpreter } from "../interpreter";
import { Program, Res } from "../types";
import { language } from "../parser";
import { IndependentTraceView } from "../uiCommon/replViews";
import { insertAt, removeAt } from "../util";
import { domainToASCII } from "url";

type Block = MarkdownNode & { id: number };
type Doc = { blocks: Block[]; nextID: number; editingID: number };

export function Editor(props: { doc: Doc }) {
  const [doc, setDoc] = useState<Doc>(props.doc);

  return (
    <>
      <AddCellButton doc={props.doc} setDoc={setDoc} insertAt={0} />
      <Blocks doc={doc} setDoc={setDoc} />
    </>
  );
}

function CodeBlock(props: {
  code: string;
  setCode: (c: string) => void;
  interp: Interpreter;
  editing: boolean;
}): { interp: Interpreter; rendered: React.ReactNode } {
  const program: Program = language.program.tryParse(props.code);
  const newInterpAndResults = program.reduce<{
    interp: Interpreter;
    results: Res[][];
    error: string | null;
  }>(
    (accum, stmt) => {
      if (accum.error) {
        return accum;
      }
      try {
        const [res, newInterp] = accum.interp.evalStmt(stmt);
        return {
          error: null,
          interp: newInterp,
          results: [...accum.results, res.results],
        };
      } catch (e) {
        return {
          ...accum,
          error: e.toString(),
        };
      }
    },
    { interp: props.interp, results: [], error: null }
  );
  return {
    interp: newInterpAndResults.interp,
    rendered: (
      <>
        <pre>{props.code}</pre>
        {newInterpAndResults.error ? (
          <pre style={{ color: "red" }}>{newInterpAndResults.error}</pre>
        ) : (
          <div className="results">
            <ul>
              {flatten(newInterpAndResults.results).map((res, idx) => (
                <IndependentTraceView key={idx} res={res} />
              ))}
            </ul>
          </div>
        )}
      </>
    ),
  };
}

function MdBlock(props: {
  content: MarkdownNode;
  setContent: (s: string) => void;
  editing: boolean;
}) {
  // TODO: editor
  return <MarkdownNode block={props.content} />;
}

function Cell(props: {
  interp: Interpreter;
  doc: Doc;
  setDoc: (d: Doc) => void;
  block: Block;
  idx: number;
}): { interp: Interpreter; view: React.ReactNode } {
  const editing = props.doc.editingID === props.block.id;
  const res = (() => {
    switch (props.block.type) {
      case "codeBlock":
        const { interp: newInterp, rendered } = CodeBlock({
          interp: props.interp,
          code: props.block.content,
          editing,
          setCode: (code) => {
            console.log("set code", code);
          },
        });
        return {
          interp: newInterp,
          view: rendered,
        };
      default:
        return {
          interp: props.interp,
          view: (
            <MdBlock
              content={props.block}
              setContent={(content) => {
                console.log("set content", content);
              }}
              editing={editing}
            />
          ),
        };
    }
  })();
  return {
    interp: res.interp,
    view: (
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
          <button
            className="form-control"
            onClick={() =>
              props.setDoc({
                ...props.doc,
                editingID: editing ? null : props.block.id,
              })
            }
          >
            {editing ? "Save" : "Edit"}
          </button>
        </div>
        <div>
          {res.view}
          <AddCellButton
            doc={props.doc}
            setDoc={props.setDoc}
            insertAt={props.idx + 1}
          />
        </div>
      </div>
    ),
  };
}

type Ctx = {
  interp: Interpreter;
  rendered: { node: React.ReactNode; id: number }[];
};

function Blocks(props: { doc: Doc; setDoc: (doc: Doc) => void }) {
  const interp = new Interpreter(".", null);

  const ctx = props.doc.blocks.reduce<Ctx>(
    (ctx, block, idx): Ctx => {
      const { interp: newInterp, view } = Cell({
        idx,
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
      {ctx.rendered.map((block) => (
        <React.Fragment key={block.id}>{block.node}</React.Fragment>
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
