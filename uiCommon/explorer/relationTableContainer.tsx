import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { remove } from "../../util/util";
import { HighlightProps } from "../dl/term";
import { RelationTable } from "./relationTable";
import { TableCollapseState } from "./types";

export function RelationTableContainer(props: {
  relation: string;
  interp: AbstractInterpreter;
  collapseState: TableCollapseState;
  setCollapseState: (c: TableCollapseState) => void;
  highlight: HighlightProps;
  pinned: string[];
  setPinned: (p: string[]) => void;
}) {
  return (
    <>
      <h3>Pinned</h3>
      {props.pinned.map((name) => (
        <div key={name}>
          <h4>
            {name}{" "}
            <button onClick={() => props.setPinned(remove(props.pinned, name))}>
              unpin
            </button>
          </h4>
          <RelationTable
            relation={name}
            collapseState={props.collapseState}
            setCollapseState={props.setCollapseState}
            highlight={props.highlight}
            interp={props.interp}
          />
        </div>
      ))}
      <h3>Main</h3>
      <h4>{props.relation}</h4>
      <RelationTable
        relation={props.relation}
        collapseState={props.collapseState}
        setCollapseState={props.setCollapseState}
        highlight={props.highlight}
        interp={props.interp}
      />
    </>
  );
}
