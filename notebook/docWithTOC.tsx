import React, { useRef } from "react";
import useScrollSpy from "react-use-scrollspy";
import { MarkdownDoc, slugify, rawText } from "./markdown";
import { getAllHeadings, TOC, getTOC, blockIdxToHeadingIdx } from "./toc";
import { useWindowWidth } from "@react-hook/window-size";

export function DocWithTOC(props: { doc: MarkdownDoc }) {
  const maxDepth = 3;
  const headings = getAllHeadings(props.doc).filter(
    (h) => h.heading.level <= 3
  );
  const headingRefs = headings.map(() => useRef(null));
  const mapping = blockIdxToHeadingIdx(headings);
  const activeSection = useScrollSpy({
    sectionElementRefs: headingRefs,
    offsetPx: -10,
  });
  const activeBlock = headings[activeSection];
  const highlightSlug = slugify(rawText(activeBlock.heading.content));

  const main = (
    <MarkdownDoc
      doc={props.doc}
      headingRefs={headingRefs}
      blockIdxToHeadingIdx={mapping}
    />
  );
  const toc = (
    <TOC toc={getTOC(props.doc, maxDepth)} highlightSlug={highlightSlug} />
  );

  return <TOCLayout main={main} toc={toc} />;
}

export function TOCLayout(props: {
  main: React.ReactNode;
  toc: React.ReactNode;
}) {
  const windowWidth = useWindowWidth();

  return windowWidth < 800 ? (
    <>
      <div>{props.toc}</div>
      <div>{props.main}</div>
    </>
  ) : (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 200px",
        gridTemplateRows: "auto",
        gridTemplateAreas: `"main sidebar"`,
      }}
    >
      <div style={{ gridArea: "main" }}>{props.main}</div>
      <div
        style={{
          gridArea: "sidebar",
        }}
      >
        <div style={{ position: "sticky", top: 10, fontSize: 14 }}>
          {props.toc}
        </div>
      </div>
    </div>
  );
}
