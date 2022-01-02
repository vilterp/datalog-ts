import React, { useMemo } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Relation, UserError } from "../../core/types";
import { filterTree, insertAtPath, Tree } from "../../util/tree";
import { contains, lastItem, toggle } from "../../util/util";
import { HighlightProps, noHighlight } from "../dl/term";
import { useBoolLocalStorage, useJSONLocalStorage } from "../generic/hooks";
import {
  emptyCollapseState,
  TreeCollapseState,
  TreeView,
} from "../generic/treeView";
import * as styles from "./styles";

export function RelationTree(props: {
  interp: AbstractInterpreter;
  allRules: Relation[];
  allTables: Relation[];
  highlight: HighlightProps;
  openRelations: string[];
  setOpenRelations: (p: string[]) => void;
}) {
  const [relTreeCollapseState, setRelTreeCollapseState] =
    useJSONLocalStorage<TreeCollapseState>(
      "rel-tree-collapse-state",
      emptyCollapseState
    );

  const [justPublic, setJustPublic] = useBoolLocalStorage("just-public", false);

  const baseRelationTree: Tree<TreeItem> = makeRelationTree(
    props.allRules,
    props.allTables
  );
  const relationTree = justPublic
    ? filterTree(
        baseRelationTree,
        (node) =>
          node.type !== "Relation" ||
          (node.type === "Relation" && isExported(node.relation.name))
      )
    : baseRelationTree;

  return (
    <>
      <div style={{ fontSize: 15, paddingBottom: 5 }}>
        <input
          id="just-public"
          type="checkbox"
          checked={justPublic}
          onChange={(evt) => setJustPublic(evt.target.checked)}
        />{" "}
        <label htmlFor="just-public">Only exported rules</label>
      </div>
      <TreeView
        hideRoot={true}
        collapseState={relTreeCollapseState}
        setCollapseState={setRelTreeCollapseState}
        tree={relationTree}
        render={(relNode) => {
          const item = relNode.item;
          switch (item.type) {
            case "Root":
              return "root";
            case "Category":
              return <strong>{item.cat}</strong>;
            case "Namespace":
              return item.name;
            case "Relation": {
              const rel = item.relation;
              const highlight = props.highlight.highlight;
              const isHighlightedRelation =
                highlight.type === "Relation" && highlight.name === rel.name;
              const isRelationOfHighlightedTerm =
                highlight.type === "Term" &&
                highlight.term.type === "Record" &&
                highlight.term.relation === rel.name;
              const isHighlighted =
                isHighlightedRelation || isRelationOfHighlightedTerm;
              const isOpen = contains(props.openRelations, item.relation.name);
              const status = getStatus(props.interp, rel.name);
              return (
                <>
                  <span
                    key={rel.name}
                    style={styles.tab({
                      open: isOpen,
                      empty: !hasContents(status),
                      highlighted: isHighlighted,
                    })}
                    onClick={() =>
                      props.setOpenRelations(
                        toggle(props.openRelations, rel.name)
                      )
                    }
                    // TODO: would be nice to factor out these handlers
                    onMouseOver={() =>
                      props.highlight.setHighlight({
                        type: "Relation",
                        name: rel.name,
                      })
                    }
                    onMouseOut={() => props.highlight.setHighlight(noHighlight)}
                  >
                    {lastItem(rel.name.split("."))}
                  </span>
                  <Status status={status} highlighted={isHighlighted} />
                </>
              );
            }
          }
        }}
      />
    </>
  );
}

function Status(props: { status: RelationStatus; highlighted: boolean }) {
  switch (props.status.type) {
    case "Count":
      return props.highlighted ? (
        <span style={{ color: "grey" }}> ({props.status.count})</span>
      ) : null;
    case "Error":
      return <span style={{ color: "red" }}> (!)</span>;
  }
}

type TreeItem =
  | { type: "Root" }
  | { type: "Category"; cat: "rules" | "tables" }
  | { type: "Namespace"; name: string }
  | { type: "Relation"; relation: Relation };

function makeRelationTree(
  allRules: Relation[],
  allTables: Relation[]
): Tree<TreeItem> {
  return {
    key: "root",
    item: { type: "Root" },
    children: [
      insertByDots("tables", allTables),
      insertByDots("rules", allRules),
    ],
  };
}

function insertByDots(
  category: "rules" | "tables",
  relations: Relation[]
): Tree<TreeItem> {
  return relations.reduce<Tree<TreeItem>>(
    (tree, rel) =>
      insertAtPath(
        tree,
        rel.name.split("."),
        {
          key: rel.name,
          item: { type: "Relation", relation: rel },
          children: [],
        },
        (name) => ({ type: "Namespace", name })
      ),
    {
      key: category,
      item: { type: "Category", cat: category },
      children: [],
    }
  );
}

function isExported(name: string): boolean {
  const firstCharOfName = lastItem(name.split("."))[0];
  return isUpperCase(firstCharOfName);
}

function isUpperCase(char: string): boolean {
  return char.toUpperCase() === char;
}

type RelationStatus = { type: "Count"; count: number } | { type: "Error" };

function getStatus(interp: AbstractInterpreter, name: string): RelationStatus {
  try {
    const count = interp.queryStr(`${name}{}`).length;
    return { type: "Count", count };
  } catch (e) {
    if (!(e instanceof UserError)) {
      console.error(`error while getting ${name}:`, e);
    }
    // TODO: this could swallow up an internal error...
    // should get better about errors...
    return { type: "Error" };
  }
}

function hasContents(status: RelationStatus) {
  return status.type === "Count" && status.count > 0;
}
