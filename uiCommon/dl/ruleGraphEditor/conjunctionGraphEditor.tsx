import React, { useRef, useState } from "react";
import { TextWithBackground } from "./textWithBackground";
import {
  RuleGraph,
  NodeDesc as NodeDescView,
  updatePos,
  getOverlappingJoinVars,
  combineNodes,
  JOIN_VAR_NODE_RADIUS,
  GraphNode,
  Edge,
  addConjunct,
  removeConjunct,
} from "./model";
import { midpoint, minusPoint, Point } from "../../../util/geom";
import {
  mouseRelativeToElementCenter,
  mouseRelativeToElementTopLeft,
} from "./mouseUtil";
import { Conjunction, Rec, Relation, Rule } from "../../../core/types";
import { conjunctionToGraph, graphToConjunction } from "./convert";

type DragState = { nodeID: string; offset: Point } | null;

type NodeAction =
  | { type: "Delete"; id: string }
  | { type: "StartDrag"; id: string; offset: Point }
  | { type: "Drag"; pos: Point }
  | { type: "Drop" };

export function ConjunctionGraphEditor(props: {
  rule: Rule; // TODO: get away with passing less?
  conjunction: Conjunction;
  setConjunction: (c: Conjunction) => void;
  relations: Relation[];
}) {
  const svgRef = useRef();
  const [dragState, setDragState] = useState<DragState>(null);
  const [selectorOption, setSelectorOption] = useState<string>("+");
  const [graph, setGraph] = useState<RuleGraph>(
    conjunctionToGraph(props.rule.head, props.conjunction)
  );
  const nodesOverlappingDraggingNode = dragState
    ? getOverlappingJoinVars(graph, dragState.nodeID)
    : [];

  const dispatch = (a: NodeAction) => {
    // TODO: consolidate into an actual reducer?
    handleAction(
      a,
      props.rule.head,
      graph,
      props.conjunction,
      dragState,
      setGraph,
      props.setConjunction,
      setDragState
    );
  };

  return (
    <>
      <div>
        <svg
          ref={svgRef}
          width={500}
          onMouseMove={(evt) => {
            evt.preventDefault();
            if (dragState) {
              const mousePos = mouseRelativeToElementTopLeft(svgRef, evt);
              const mouseMinusOffset = minusPoint(mousePos, dragState.offset);
              dispatch({ type: "Drag", pos: mouseMinusOffset });
            }
          }}
          onMouseUp={() => {
            dispatch({ type: "Drop" });
          }}
        >
          <g>
            {graph.edges.map((edge) => {
              return (
                <EdgeView
                  key={`${edge.fromID}-${edge.toID}`}
                  ruleGraph={graph}
                  edge={edge}
                />
              );
            })}
          </g>
          <g>
            {Object.entries(graph.nodes).map(([id, node]) => (
              <NodeView
                key={id}
                id={id}
                node={node}
                nodesOverlappingDraggingNode={nodesOverlappingDraggingNode}
                dragState={dragState}
                dispatch={dispatch}
              />
            ))}
          </g>
        </svg>
      </div>
      <div>
        <select
          value={selectorOption}
          onChange={(evt) => {
            const relationName = evt.target.value;
            props.setConjunction(
              addConjunct(
                props.conjunction,
                props.rule,
                props.relations,
                relationName
              )
            );
            setSelectorOption("+");
          }}
        >
          <option>+</option>
          {props.relations.map((relation, idx) => (
            <option key={idx}>{relation.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function EdgeView(props: { ruleGraph: RuleGraph; edge: Edge }) {
  const { edge, ruleGraph } = props;
  const fromNode = ruleGraph.nodes[edge.fromID];
  const toNode = ruleGraph.nodes[edge.toID];
  const edgeMidpoint = midpoint(fromNode.pos, toNode.pos);
  return (
    <g>
      <line
        x1={fromNode.pos.x}
        y1={fromNode.pos.y}
        x2={toNode.pos.x}
        y2={toNode.pos.y}
        style={{
          stroke: "black",
          strokeWidth: 2,
        }}
      />
      <g transform={`translate(${edgeMidpoint.x} ${edgeMidpoint.y})`}>
        <TextWithBackground
          padding={5}
          rectStyle={{ fill: "white" }}
          textStyle={{ fontFamily: "monospace", cursor: "default" }}
          text={edge.label}
        />
      </g>
    </g>
  );
}

function NodeView(props: {
  id: string;
  node: GraphNode;
  nodesOverlappingDraggingNode: string[];
  dragState: DragState;
  dispatch: (action: NodeAction) => void;
}) {
  const { id, node, dragState, nodesOverlappingDraggingNode } = props;
  const dragging = dragState && dragState.nodeID === id;
  const draggedNodeOverlappingThis =
    nodesOverlappingDraggingNode.indexOf(id) !== -1;
  const thisDraggedOverSomeNode =
    dragging && nodesOverlappingDraggingNode.length > 0;
  const overlapping = draggedNodeOverlappingThis || thisDraggedOverSomeNode;
  const ref = useRef<SVGGraphicsElement>();

  const handleDelete = () => {
    props.dispatch({ type: "Delete", id });
  };

  return (
    <g
      ref={ref}
      transform={`translate(${node.pos.x} ${node.pos.y})`}
      style={{ cursor: dragging ? "grabbing" : "grab" }}
      onMouseDown={(evt) => {
        props.dispatch({
          type: "StartDrag",
          id,
          offset: mouseRelativeToElementCenter(ref, evt),
        });
      }}
    >
      <NodeDescView
        nodeDesc={node.desc}
        overlapping={overlapping}
        dispatchDelete={handleDelete}
      />
    </g>
  );
}

function NodeDescView(props: {
  nodeDesc: NodeDescView;
  overlapping: boolean;
  dispatchDelete: () => void;
}) {
  switch (props.nodeDesc.type) {
    case "JoinVar":
      return (
        <g
          onContextMenu={(evt) => {
            evt.preventDefault();
            props.dispatchDelete();
          }}
        >
          <circle
            r={JOIN_VAR_NODE_RADIUS}
            fill={props.overlapping ? "orange" : "white"}
            stroke="black"
          />
          <text
            style={{ fill: "orange", fontFamily: "monospace" }}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {props.nodeDesc.name}
          </text>
        </g>
      );
    case "Relation": {
      return (
        <TextWithBackground
          onContextMenu={(evt) => {
            evt.preventDefault();
            props.dispatchDelete();
          }}
          text={props.nodeDesc.name}
          textStyle={{
            fontFamily: "monospace",
            pointerEvents: "none",
            fill: "purple",
          }}
          rectStyle={{
            fill: props.nodeDesc.isHead ? "lightblue" : "white",
            stroke: "black",
          }}
          padding={5}
        />
      );
    }
  }
}

function handleAction(
  action: NodeAction,
  head: Rec,
  graph: RuleGraph,
  conjunction: Conjunction,
  dragState: DragState,
  setGraph: (g: RuleGraph) => void,
  setConjunction: (conj: Conjunction) => void,
  setDragState: (ds: DragState) => void
) {
  console.log("handleAction", action);
  switch (action.type) {
    case "Delete": {
      setDragState(null); // otherwise the node re-appears
      const node = graph.nodes[action.id];
      const newConj: Conjunction = (() => {
        switch (node.desc.type) {
          case "Relation":
            if (node.desc.isHead) {
              return;
            }
            return removeConjunct(conjunction, parseInt(action.id));
          case "JoinVar":
            console.error("TODO: join var");
            return conjunction;
        }
      })();
      // getting a bit tricky to keep these in sync
      setConjunction(newConj);
      setGraph(conjunctionToGraph(head, newConj));
      break;
    }
    case "Drop": {
      setDragState(null);
      if (!dragState) {
        return;
      }
      const overlappingIDs = getOverlappingJoinVars(graph, dragState.nodeID);
      const newGraph = overlappingIDs.reduce((curGraph, overlappingID) => {
        const combined = combineNodes(
          curGraph,
          dragState.nodeID,
          overlappingID
        );
        return combined;
      }, graph);
      const newConj = graphToConjunction(newGraph);
      setConjunction(newConj);
      break;
    }
    case "StartDrag": {
      setDragState({ nodeID: action.id, offset: action.offset });
      break;
    }
    case "Drag": {
      const newGraph = updatePos(graph, dragState.nodeID, action.pos);
      setGraph(newGraph);
      break;
    }
  }
}
