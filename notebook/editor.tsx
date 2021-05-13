import React, { useState } from "react";
import { MarkdownNode, parse } from "./markdown";
import { Interpreter } from "../core/interpreter";
import { Program, Res } from "../core/types";
import { language } from "../core/parser";
import { IndependentTraceView } from "../uiCommon/replViews";
import { insertAtIdx, removeAtIdx, updateAtIdx, flatten } from "../util/util";
import TextAreaAutosize from "react-textarea-autosize";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Collapsible } from "../uiCommon/collapsible";
import Parsimmon, { Result } from "parsimmon";

type Block = { id: number; content: string; type: "Code" | "Markdown" };
export type Doc = { blocks: Block[]; nextID: number; editingID: number };

export const emptyDoc: Doc = {
  nextID: 1,
  editingID: null,
  blocks: [{ type: "Markdown", id: 0, content: "## My Notebook" }],
};

export function Editor(props: { doc: Doc; viewMode: boolean }) {
  const [doc, setDoc] = useState<Doc>(props.doc);

  return (
    <>
      {/* TODO: debug this one */}
      {/* <AddCellButton doc={props.doc} setDoc={setDoc} insertAt={0} /> */}
      <Blocks doc={doc} setDoc={setDoc} viewMode={props.viewMode} />
      <Collapsible
        initiallyCollapsed={true}
        heading="Markdown Export"
        content={<MdExport doc={doc} />}
      />
    </>
  );
}

function MdExport(props: { doc: Doc }) {
  const [copied, setCopied] = useState(false);

  const asMarkdown = docToMarkdown(props.doc);

  return (
    <div>
      <CopyToClipboard text={asMarkdown} onCopy={() => setCopied(true)}>
        <button>{copied ? "Copied" : "Copy"}</button>
      </CopyToClipboard>
      <pre>{asMarkdown}</pre>
    </div>
  );
}

function CodeBlock(props: {
  code: string;
  setCode: (c: string) => void;
  interp: Interpreter;
  editing: boolean;
}): { interp: Interpreter; rendered: React.ReactNode } {
  const programRes: Result<Program> = language.program.parse(props.code);
  const newInterpAndResults =
    programRes.status === false
      ? {
          interp: props.interp,
          results: [],
          error: Parsimmon.formatError(props.code, programRes),
        }
      : programRes.value.reduce<{
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
        {props.editing ? (
          // TODO: IDE features. lol
          <TextAreaAutosize
            style={{ fontFamily: "monospace", fontSize: 13 }}
            value={props.code}
            onChange={(evt) => props.setCode(evt.target.value)}
            cols={60}
          />
        ) : (
          <pre>{props.code}</pre>
        )}
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
        style={{ fontSize: 13 }}
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
  viewMode: boolean;
  idx: number;
  block: Block;
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
      <div style={{ display: "flex" }}>
        <div>{res.view}</div>
        {props.viewMode ? null : (
          <div style={{ fontSize: 10 }}>
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
          </div>
        )}
      </div>
    ),
  };
}

type Ctx = {
  interp: Interpreter;
  rendered: { node: React.ReactNode; id: number }[];
};

function Blocks(props: {
  doc: Doc;
  setDoc: (doc: Doc) => void;
  viewMode: boolean;
}) {
  const interp = new Interpreter(".", null);

  const ctx = props.doc.blocks.reduce<Ctx>(
    (ctx, block, idx): Ctx => {
      const { interp: newInterp, view } = Cell({
        idx,
        block: block,
        interp: ctx.interp,
        viewMode: props.viewMode,
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
        Add DL
      </button>
    </>
  );
}

function docToMarkdown(doc: Doc): string {
  return doc.blocks
    .map((block) => {
      switch (block.type) {
        case "Code":
          return ["```dl", block.content, "```"].join("\n");
        case "Markdown":
          return block.content;
      }
    })
    .join("\n\n");
}
