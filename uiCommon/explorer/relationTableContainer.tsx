import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { remove } from "../../util/util";
import { HighlightProps } from "../dl/term";
import { RelationTable } from "./relationTable";
import { RelationCollapseStates, TableCollapseState } from "./types";

export function RelationTableContainer(props: {
  interp: AbstractInterpreter;
  collapseStates: RelationCollapseStates;
  setCollapseStates: (c: RelationCollapseStates) => void;
  highlight: HighlightProps;
  pinned: string[];
  setPinned: (p: string[]) => void;
}) {
  return (
    <>
      {props.pinned.length === 0 ? (
        <em>Click a relation on the left to open it.</em>
      ) : null}
      {props.pinned.map((name) => (
        <div key={name}>
          <h4 style={{ fontFamily: "monospace" }}>
            <button onClick={() => props.setPinned(remove(props.pinned, name))}>
              x
            </button>{" "}
            {/* TODO: only show name for tables */}
            {name}
          </h4>
          <RelationTable
            relation={name}
            collapseState={props.collapseStates[name] || {}}
            setCollapseState={(st: TableCollapseState) =>
              props.setCollapseStates({ ...props.collapseStates, [name]: st })
            }
            highlight={props.highlight}
            interp={props.interp}
          />
        </div>
      ))}
    </>
  );
}
