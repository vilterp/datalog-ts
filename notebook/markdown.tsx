import React, { Ref } from "react";
import SimpleMarkdown from "simple-markdown";
import { repeat } from "../util";

export function parse(md: string): MarkdownDoc {
  return SimpleMarkdown.defaultBlockParse(md) as MarkdownDoc;
}

export type MarkdownDoc = MarkdownNode[];

export type MarkdownNode =
  | { type: "paragraph"; content: MarkdownNode[] }
  | Heading
  | { type: "codeBlock"; lang: string; content: string }
  | { type: "list"; ordered: boolean; items: MarkdownNode[] }
  | { type: "table"; header: MarkdownNode[][]; cells: MarkdownNode[][][] }
  | { type: "text"; content: string }
  | { type: "inlineCode"; content: string }
  | { type: "image"; target: string }
  | { type: "em"; content: MarkdownNode[] }
  | { type: "strong"; content: MarkdownNode[] }
  | { type: "link"; content: MarkdownNode[]; target: string }
  | { type: "newline" };

export type Heading = {
  type: "heading";
  level: number;
  content: MarkdownNode[];
};

export function MarkdownDoc(props: {
  doc: MarkdownDoc;
  headingRefs: Ref<null>[];
  blockIdxToHeadingIdx: { [blockIdx: string]: number };
}) {
  return (
    <>
      {props.doc.map((block, idx) => {
        const headingRefIdx = props.blockIdxToHeadingIdx[idx];
        const headingRef =
          headingRefIdx !== undefined ? props.headingRefs[headingRefIdx] : null;
        return <MarkdownNode key={idx} block={block} curRef={headingRef} />;
      })}
    </>
  );
}

export function MarkdownNode(props: {
  block: MarkdownNode | MarkdownNode[];
  curRef?: Ref<null> | null;
}) {
  if (Array.isArray(props.block)) {
    return (
      <>
        {props.block.map((span, idx) => (
          <MarkdownNode key={idx} block={span} />
        ))}
      </>
    );
  }
  const block = props.block;
  switch (block.type) {
    case "codeBlock":
      // TODO: look at lang
      return <pre>{block.content}</pre>;
    case "heading":
      const content = <MarkdownNode block={block.content} />;
      const hProps = { id: slugify(rawText(block.content)), ref: props.curRef };
      switch (block.level) {
        case 1:
          return <h1 {...hProps}>{content}</h1>;
        case 2:
          return <h2 {...hProps}>{content}</h2>;
        case 3:
          return <h3 {...hProps}>{content}</h3>;
        case 4:
          return <h4 {...hProps}>{content}</h4>;
        default:
          throw Error(`can't do h${block.level}`);
      }
    case "list":
      const items = block.items.map((item, idx) => (
        <li key={idx}>
          <MarkdownNode block={item} />
        </li>
      ));
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    case "paragraph":
      return (
        <p>
          <MarkdownNode block={block.content} />
        </p>
      );
    case "table":
      return (
        <table>
          <thead>
            <tr>
              {block.header.map((cell, idx) => (
                <th key={idx}>
                  <MarkdownNode block={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.cells.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((col, colIdx) => (
                  <td key={colIdx}>
                    <MarkdownNode block={col} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "inlineCode":
      return <code>{block.content}</code>;
    case "text":
      return <>{block.content}</>;
    case "image":
      return <img src={block.target} />;
    case "link":
      return (
        <a href={block.target} target="_blank">
          <MarkdownNode block={block.content} />
        </a>
      );
    case "em":
      return (
        <em>
          <MarkdownNode block={block.content} />
        </em>
      );
    case "strong":
      return (
        <strong>
          <MarkdownNode block={block.content} />
        </strong>
      );
    case "newline":
      return <br />;
  }
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .split(/[^a-z]/)
    .join("");
}

export function rawText(spans: MarkdownNode[]) {
  return spans.map(rawTextSpan).join("");
}

function rawTextSpan(span: MarkdownNode) {
  switch (span.type) {
    case "em":
      return rawText(span.content);
    case "image":
      return "";
    case "inlineCode":
      return span.content;
    case "link":
      return rawText(span.content);
    case "text":
      return span.content;
    // ...
  }
}

// ugh why isn't this in the library
export function markdownToText(block: MarkdownNode): string {
  switch (block.type) {
    case "codeBlock":
      // TODO: look at lang
      return ["```", block.content, "```"].join("\n");
    case "heading":
      return `${repeat(block.level, "#")} ${block.content
        .map(markdownToText)
        .join("")}`;
    case "list":
      // crap this doesn't work for nested lists
      // should have used prettier
      return block.items.map((item) => `- ${markdownToText(item)}`).join("\n");
    case "paragraph":
      return block.content.map(markdownToText).join("");
    case "table":
      throw new Error("TODO: tables");
    case "inlineCode":
      return "`" + block.content + "`";
    case "text":
      return block.content;
    case "image":
      return `![](${block.target})`;
    case "link":
      return `[${block.content}](${block.target})`;
    case "em":
      return `_${block.content.map(markdownToText).join("")}_`;
    case "strong":
      return `**${block.content.map(markdownToText).join("")}**`;
    case "newline":
      return "\n";
  }
}
