import React from "react";
import { MarkdownDoc, parse } from "./markdown";

export type Block<T> =
  | { type: "ImplicitUpdate"; update: (t: T) => T }
  | { type: "Markdown"; content: MarkdownDoc }
  | {
      type: "RenderAndUpdate";
      render: (t: T) => [T, React.ReactNode];
    };

export function md<T>(content: string): Block<T> {
  return {
    type: "Markdown",
    content: parse(content),
  };
}

export function implicit<T>(fn: (t: T) => T): Block<T> {
  return { type: "ImplicitUpdate", update: fn };
}

export function renderAndUpdate<T>(
  fn: (t: T) => [T, React.ReactNode]
): Block<T> {
  return { type: "RenderAndUpdate", render: fn };
}

export function render<T>(fn: (t: T) => React.ReactNode): Block<T> {
  return { type: "RenderAndUpdate", render: (t: T) => [t, fn(t)] };
}

type State<T> = { rendered: React.ReactNode[]; state: T };

export function BlockList<T>(props: { initState: T; blocks: Block<T>[] }) {
  const st = props.blocks.reduce<State<T>>(processBlock, {
    rendered: [],
    state: props.initState,
  });
  return (
    <>
      {st.rendered.map((block, idx) => (
        <div className="block" key={idx}>
          {block}
        </div>
      ))}
    </>
  );
}

function processBlock<T>(st: State<T>, block: Block<T>): State<T> {
  switch (block.type) {
    case "ImplicitUpdate":
      return { ...st, state: block.update(st.state) };
    case "RenderAndUpdate":
      const [newState, renderedBlock] = block.render(st.state);
      return { state: newState, rendered: [...st.rendered, renderedBlock] };
    case "Markdown":
      return {
        state: st.state,
        rendered: [
          ...st.rendered,
          <MarkdownDoc
            doc={block.content}
            blockIdxToHeadingIdx={{}}
            headingRefs={[]}
          />,
        ],
      };
  }
}

export function extractMarkdownDoc<T>(blocks: Block<T>[]): MarkdownDoc {
  let out: MarkdownDoc = [];
  blocks.forEach((b) => {
    if (b.type === "Markdown") {
      out = [...out, ...b.content];
    }
  });
  return out;
}
