import React, { CSSProperties, useMemo } from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, rec, UserError } from "../../core/types";
import { filterTree, insertAtPath, node, Tree } from "../../util/tree";
import { contains, lastItem, sortBy, toggle } from "../../util/util";
import { HighlightProps, noHighlight } from "../dl/term";
import { useBoolLocalStorage, useJSONLocalStorage } from "../generic/hooks";
import {
  emptyCollapseState,
  TreeCollapseState,
  TreeView,
} from "../generic/treeView";
import * as styles from "./styles";
import { RelationWithStatus, RelationStatus } from "./types";

export function RelationTree(props: {
  interp: AbstractInterpreter;
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

  const { rules, tables } = useMemo(
    () => getRulesAndTables(props.interp),
    [props.interp]
  );

  const baseRelationTree: Tree<NodeWithCounts> = makeRelationTree(
    rules,
    tables
  );
  const relationTree = justPublic
    ? filterTree(
        baseRelationTree,
        (node) =>
          node.item.type !== "Relation" ||
          (node.item.type === "Relation" &&
            isExported(node.item.relation.relation.name))
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
          const item = relNode.item.item;
          const counts = relNode.item.counts;
          switch (item.type) {
            case "Root":
              return "root";
            case "Category":
              return (
                <strong style={internalNodeStyle(counts)}>{item.cat}</strong>
              );
            case "Namespace":
              return <span style={internalNodeStyle(counts)}>{item.name}</span>;
            case "Relation": {
              const rel = item.relation;
              const highlight = props.highlight.highlight;
              const isHighlightedRelation =
                highlight.type === "Relation" &&
                highlight.name === rel.relation.name;
              const isRelationOfHighlightedTerm =
                highlight.type === "Term" &&
                highlight.term.type === "Record" &&
                highlight.term.relation === rel.relation.name;
              const isHighlighted =
                isHighlightedRelation || isRelationOfHighlightedTerm;
              const isOpen = contains(
                props.openRelations,
                item.relation.relation.name
              );
              const status = rel.status;
              return (
                <>
                  <span
                    key={rel.relation.name}
                    style={styles.tab({
                      open: isOpen,
                      errors: status.type === "Error",
                      empty: !hasContents(status),
                      highlighted: isHighlighted,
                    })}
                    onClick={() =>
                      props.setOpenRelations(
                        toggle(props.openRelations, rel.relation.name)
                      )
                    }
                    // TODO: would be nice to factor out these handlers
                    onMouseOver={() =>
                      props.highlight.setHighlight({
                        type: "Relation",
                        name: rel.relation.name,
                      })
                    }
                    onMouseOut={() => props.highlight.setHighlight(noHighlight)}
                  >
                    {lastItem(rel.relation.name.split("."))}
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
    default:
      return null;
  }
}

// TODO: this should probably be in AbstractInterpreter
function getRulesAndTables(interp: AbstractInterpreter): {
  rules: RelationWithStatus[];
  tables: RelationWithStatus[];
} {
  const allRules: RelationWithStatus[] = sortBy(
    interp.getRules(),
    (r) => r.head.relation
  ).map((rule) => ({
    relation: interp.getRelation(rule.head.relation),
    status: getStatus(interp, rule.head.relation),
  }));
  const allTables: RelationWithStatus[] = [
    ...interp
      .getTables()
      .sort()
      .map((name): RelationWithStatus => {
        return {
          relation: interp.getRelation(name),
          status: getStatus(interp, name),
        };
      }),
    // TODO: virtual tables
  ];
  return { rules: allRules, tables: allTables };
}

function internalNodeStyle(counts: NodeCounts): CSSProperties {
  return styles.tab({
    empty: counts.count === 0,
    errors: counts.errors > 0,
    highlighted: false,
    open: false,
  });
}

type NodeCounts = { errors: number; count: number };

type NodeWithCounts = { item: TreeItem; counts: NodeCounts };

type TreeItem =
  | { type: "Root" }
  | { type: "Category"; cat: "rules" | "tables" }
  | { type: "Namespace"; name: string }
  | { type: "Relation"; relation: RelationWithStatus };

function makeRelationTree(
  allRules: RelationWithStatus[],
  allTables: RelationWithStatus[]
): Tree<NodeWithCounts> {
  const rawTree: Tree<TreeItem> = {
    key: "root",
    item: { type: "Root" },
    children: [
      insertByDots("tables", allTables),
      insertByDots("rules", allRules),
    ],
  };
  return getSums(rawTree);
}

function getSums(rawNode: Tree<TreeItem>): Tree<NodeWithCounts> {
  const children = rawNode.children.map((child) => getSums(child));
  const curCounts = countsForItem(rawNode.item);
  const childCountsSum: NodeCounts = children.reduce(
    (prev, item) => addCounts(prev, item.item.counts),
    {
      count: 0,
      errors: 0,
    }
  );
  const totalCounts = addCounts(childCountsSum, curCounts);
  return node(
    rawNode.key,
    { item: rawNode.item, counts: totalCounts },
    children
  );
}

function addCounts(a: NodeCounts, b: NodeCounts): NodeCounts {
  return { errors: a.errors + b.errors, count: a.count + b.count };
}

function countsForItem(item: TreeItem): NodeCounts {
  switch (item.type) {
    case "Relation":
      const status = item.relation.status;
      return status.type === "Error"
        ? { errors: 1, count: 0 }
        : { errors: 0, count: status.count };
    default:
      return { errors: 0, count: 0 };
  }
}

function insertByDots(
  category: "rules" | "tables",
  relations: RelationWithStatus[]
): Tree<TreeItem> {
  return relations.reduce<Tree<TreeItem>>(
    (tree, rel) =>
      insertAtPath(
        tree,
        rel.relation.name.split("."),
        {
          key: rel.relation.name,
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

function hasContents(status: RelationStatus) {
  return status.type === "Count" && status.count > 0;
}

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
