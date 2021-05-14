import React, { useState } from "react";
import useHashParam from "use-hash-param";
import { Interpreter } from "../core/interpreter";
import { Relation } from "../core/types";
import * as styles from "./styles";
import { RelationTable, TableCollapseState } from "./relationTable";
import { noHighlight, HighlightProps } from "./term";
import { useJSONLocalStorage, useBoolLocalStorage } from "./hooks";
import { TreeView, TreeCollapseState, emptyCollapseState } from "./treeView";
import { Tree, insertAtPath, filterTree } from "../util/tree";
import { lastItem } from "../util/util";

type RelationCollapseStates = { [key: string]: TableCollapseState };

export function TabbedTables(props: { interp: Interpreter }) {
  const allRules: Relation[] = Object.keys(props.interp.db.rules)
    .sort()
    .map((name) => ({ type: "Rule", name, rule: props.interp.db.rules[name] }));
  const allTables: Relation[] = [
    ...Object.keys(props.interp.db.tables)
      .sort()
      .map(
        (name): Relation => ({
          type: "Table",
          name,
          records: props.interp.db.tables[name],
        })
      ),
    ...Object.keys(props.interp.db.virtualTables)
      .sort()
      .map(
        (name): Relation => ({
          type: "Table",
          name,
          records: props.interp.db.virtualTables[name](props.interp.db),
        })
      ),
  ];
  const allRelations: Relation[] = [...allTables, ...allRules];

  const [highlight, setHighlight] = useState(noHighlight);
  const highlightProps: HighlightProps = {
    highlight,
    setHighlight,
    parentPaths: [],
    childPaths: [],
  };

  const [curRelationName, setCurRelationName]: [
    string,
    (v: string) => void
  ] = useHashParam(
    "relation",
    allRelations.length === 0 ? null : allRelations[0].name
  );
  const [
    relationCollapseStates,
    setRelationCollapseStates,
  ] = useJSONLocalStorage<RelationCollapseStates>("collapse-state", {});

  const curRelation = allRelations.find((r) => r.name === curRelationName);

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          border: "1px solid black",
          overflow: "scroll",
          paddingTop: 10,
          paddingBottom: 10,
          width: 275, // TODO: make the divider draggable
        }}
      >
        <RelationTree
          allRules={allRules}
          allTables={allTables}
          highlight={highlightProps}
          curRelationName={curRelationName}
          setCurRelationName={setCurRelationName}
        />
      </div>
      <div style={{ padding: 10, border: "1px solid black", flexGrow: 1 }}>
        {curRelation ? (
          <RelationTable
            relation={curRelation}
            interp={props.interp}
            highlight={highlightProps}
            collapseState={relationCollapseStates[curRelationName] || {}}
            setCollapseState={(st) =>
              setRelationCollapseStates({
                ...relationCollapseStates,
                [curRelationName]: st,
              })
            }
          />
        ) : (
          <em>No relations</em>
        )}
      </div>
    </div>
  );
}

function RelationTree(props: {
  allRules: Relation[];
  allTables: Relation[];
  curRelationName: string;
  setCurRelationName: (s: string) => void;
  highlight: HighlightProps;
}) {
  const [relTreeCollapseState, setRelTreeCollapseState] = useJSONLocalStorage<
    TreeCollapseState
  >("rel-tree-collapse-state", emptyCollapseState);

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
            case "Relation":
              const rel = item.relation;
              return (
                <span
                  key={rel.name}
                  style={styles.tab({
                    selected: rel.name === props.curRelationName,
                    highlighted:
                      props.highlight.highlight.type === "Relation" &&
                      props.highlight.highlight.name === rel.name,
                  })}
                  onClick={() => props.setCurRelationName(rel.name)}
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
              );
          }
        }}
      />
    </>
  );
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
