import React from "react";

import {
  MarkdownDoc,
  Heading,
  slugify,
  rawText,
  MarkdownNode,
} from "./markdown";

// "tree of contents" lol
export type TOC = { content: MarkdownNode[]; children: TOC[] };

// assuming that we start at H2
export function getTOC(doc: MarkdownDoc, maxDepth: number): TOC {
  return getAllHeadings(doc).reduce<TOC>(
    (toc, heading) => insertIntoTOC(toc, 2, heading.heading, maxDepth),
    { content: [], children: [] }
  );
}

export function getAllHeadings(
  doc: MarkdownDoc
): { heading: Heading; blockIdx: number }[] {
  const out = [];
  doc.forEach((block, idx) => {
    if (block.type === "heading") {
      out.push({
        heading: block,
        blockIdx: idx,
      });
    }
  });
  return out;
}

export function blockIdxToHeadingIdx(
  headings: { heading: Heading; blockIdx: number }[]
): { [blockIdx: string]: number } {
  const out = {};
  headings.forEach((heading, headingIdx) => {
    out[heading.blockIdx] = headingIdx;
  });
  return out;
}

function insertIntoTOC(
  toc: TOC,
  depth: number,
  heading: Heading,
  maxDepth: number
): TOC {
  if (depth > maxDepth) {
    return toc;
  }
  if (heading.level <= depth) {
    return {
      ...toc,
      children: [...toc.children, { content: heading.content, children: [] }],
    };
  } else {
    const lastChild = toc.children[toc.children.length - 1];
    const allButLast = toc.children.slice(0, toc.children.length - 1);
    return {
      ...toc,
      children: [
        ...allButLast,
        insertIntoTOC(lastChild, depth + 1, heading, maxDepth),
      ],
    };
  }
}

export function TOC(props: { toc: TOC; highlightSlug: string | null }) {
  return (
    <div className="toc">
      <TOCChildren toc={props.toc} highlightSlug={props.highlightSlug} />
    </div>
  );
}

function TOCNode(props: { toc: TOC; highlightSlug: string | null }) {
  const slug = slugify(rawText(props.toc.content));
  const isHighlighted = props.highlightSlug === slug;
  return (
    <>
      <a
        href={`#${slug}`}
        style={{ fontWeight: isHighlighted ? "bold" : "normal" }}
      >
        <MarkdownNode block={props.toc.content} />
      </a>
      <TOCChildren toc={props.toc} highlightSlug={props.highlightSlug} />
    </>
  );
}

function TOCChildren(props: { toc: TOC; highlightSlug: string | null }) {
  return (
    <ul>
      {props.toc.children.map((child, idx) => (
        <li key={idx}>
          {<TOCNode toc={child} highlightSlug={props.highlightSlug} />}
        </li>
      ))}
    </ul>
  );
}
