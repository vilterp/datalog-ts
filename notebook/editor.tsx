import React, { useState } from "react";
import { MarkdownNode, parse } from "./markdown";
import { Interpreter } from "../interpreter";
import { Program, Res } from "../types";
import { language } from "../parser";
import { IndependentTraceView } from "../uiCommon/replViews";
import { insertAtIdx, removeAtIdx, updateAtIdx } from "../util";
import TextAreaAutosize from "react-textarea-autosize";

type Block = { id: number; content: string; type: "Code" | "Markdown" };
type Doc = { blocks: Block[]; nextID: number; editingID: number };

export function Editor(props: { doc: Doc }) {
  const [doc, setDoc] = useState<Doc>(props.doc);

  return (
    <>
      {/* TODO: debug this one */}
      {/* <AddCellButton doc={props.doc} setDoc={setDoc} insertAt={0} /> */}
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
    rendered: props.editing ? (
      // TODO: IDE features. lol
      <TextAreaAutosize
        style={{ fontFamily: "monospace", fontSize: 13 }}
        value={props.code}
        onChange={(evt) => props.setCode(evt.target.value)}
        cols={60}
      />
    ) : (
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
  content: string;
  setContent: (s: string) => void;
  editing: boolean;
}) {
  return props.editing ? (
    <div>
      <TextAreaAutosize
        style={{ fontFamily: "monospace", fontSize: 13 }}
        onChange={(evt) => props.setContent(evt.target.value)}
        value={props.content}
        cols={60}
      />
    </div>
  ) : (
    <MarkdownNode block={parse(props.content)} />
  );
}

function Cell(props: {
  interp: Interpreter;
  doc: Doc;
  setDoc: (d: Doc) => void;
  block: Block;
  idx: number;
}): { interp: Interpreter; view: React.ReactNode } {
  const editing = props.doc.editingID === props.block.id;
  const setContent = (content: string) => {
    props.setDoc({
      ...props.doc,
      blocks: updateAtIdx(props.doc.blocks, props.idx, (block) => ({
        ...block,
        content,
      })),
    });
  };
  const res = (() => {
    switch (props.block.type) {
      case "Code":
        const { interp: newInterp, rendered } = CodeBlock({
          interp: props.interp,
          code: props.block.content,
          editing,
          setCode: setContent,
        });
        return {
          interp: newInterp,
          view: rendered,
        };
      case "Markdown":
        return {
          interp: props.interp,
          view: (
            <MdBlock
              content={props.block.content}
              setContent={setContent}
              editing={editing}
            />
          ),
        };
    }
  })();
  return {
    interp: res.interp,
    view: (
      <tr>
        <td className="markdown-body">{res.view}</td>
        <td style={{ fontSize: 10 }}>
          <button
            className="form-control"
            onClick={() => {
              props.setDoc({
                ...props.doc,
                blocks: removeAtIdx(props.doc.blocks, props.idx),
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
          <AddCellButton
            doc={props.doc}
            setDoc={props.setDoc}
            insertAt={props.idx + 1}
          />
        </td>
      </tr>
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
    <table>
      <tbody>
        {ctx.rendered.map((block) => (
          <React.Fragment key={block.id}>{block.node}</React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

function AddCellButton(props: {
  doc: Doc;
  setDoc: (doc: Doc) => void;
  insertAt: number;
}) {
  const addCell = (block: Block) => {
    const newBlocks = insertAtIdx(props.doc.blocks, props.insertAt, block);
    props.setDoc({
      ...props.doc,
      nextID: props.doc.nextID + 1,
      blocks: newBlocks,
    });
  };
  return (
    <>
      <button
        className="form-control"
        onClick={() => {
          addCell({
            type: "Markdown",
            content: `new cell ${props.doc.nextID}`,
            id: props.doc.nextID,
          });
        }}
      >
        Add MD
      </button>
      <button
        className="form-control"
        onClick={() => {
          addCell({
            type: "Code",
            content: "",
            id: props.doc.nextID,
          });
        }}
      >
        Add Code
      </button>
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
