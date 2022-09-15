import React, { useEffect, useRef, useState } from "react";
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
  splitUpVar,
  desiredJoinVarPosition,
} from "./model";
import { midpoint, minusPoint, Point } from "../../../util/geom";
import {
  mouseRelativeToElementCenter,
  mouseRelativeToElementTopLeft,
} from "./mouseUtil";
import { Conjunction, Rec, Relation, Rule } from "../../../core/types";
import {
  conjunctionToGraph,
  DEFAULT_POINT,
  graphToConjunction,
} from "./convert";
import {
  forceSimulation,
  forceLink,
  forceX,
  forceY,
  forceManyBody,
} from "d3-force";
import { filterMapObj, mapObj, mapObjToList } from "../../../util/util";
import { ppt } from "../../../core/pretty";

type Context = { rule: Rule; relations: Relation[] };

type State = {
  conjunction: Conjunction;
  graph: RuleGraph;
  selectorOption: string;
  dragState: DragState;
};

type DragState = { nodeID: string; offset: Point; position: Point } | null;

type NodeAction =
  | { type: "Delete"; id: string }
  | { type: "StartDrag"; id: string; offset: Point; position: Point }
  | { type: "Drag"; pos: Point }
  | { type: "Drop" }
  | { type: "AddConjunct"; relationName: string };

type D3Point = Point & { id: string; fx?: number; fy?: number };

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

  // TODO: this is kinda clumsy...
  const dispatch = (action: NodeAction) => {
    const context: Context = {
      relations: props.relations,
      rule: props.rule,
    };
    const state: State = {
      conjunction: props.conjunction,
      dragState: dragState,
      graph,
      selectorOption,
    };
    const newState = reducer(action, context, state);
    if (newState.conjunction !== state.conjunction) {
      props.setConjunction(newState.conjunction);
    }
    if (newState.dragState !== state.dragState) {
      setDragState(newState.dragState);
    }
    if (newState.graph !== state.graph) {
      setGraph(newState.graph);
    }
    if (newState.selectorOption !== state.selectorOption) {
      setSelectorOption(newState.selectorOption);
    }
  };

  // compute where join vars want to be
  const joinVardesiredPositions = filterMapObj(graph.nodes, (id, node) => {
    if (node.desc.type !== "JoinVar") {
      return null;
    }
    return desiredJoinVarPosition(graph, id);
  });
  console.log("joinVarDesiredPositions", joinVardesiredPositions);

  useEffect(() => {
    const simulation = forceSimulation<D3Point>();

    const d3NodesByID: {
      [id: string]: D3Point;
    } = {};
    Object.entries(graph.nodes).forEach(([id, node]) => {
      const d3Node: D3Point = { ...node.pos, id };
      if (dragState && dragState.nodeID === id) {
        d3Node.fx = dragState.position.x;
        d3Node.fy = dragState.position.y;
      }
      if (node.desc.type === "Relation" && node.desc.isHead) {
        d3Node.fx = DEFAULT_POINT.x;
        d3Node.fy = 20;
      }
      d3NodesByID[id] = d3Node;
    });

    // update state on every frame
    simulation.on("tick", () => {
      setGraph({
        ...graph,
        nodes: mapObj(graph.nodes, (id, node) => {
          const d3Node = d3NodesByID[id];
          return {
            ...node,
            pos: { x: Math.round(d3Node.x), y: Math.round(d3Node.y) },
          };
        }),
      });
    });

    const linksForce = forceLink();
    linksForce
      .links(
        graph.edges.map((edge) => ({
          source: d3NodesByID[edge.fromID],
          target: d3NodesByID[edge.toID],
        }))
      )
      .distance(100)
      .strength(5);

    // simulation.force("links", linksForce);
    simulation.force(
      "x",
      forceX((node) => {
        const desired = joinVardesiredPositions[node.id];
        if (desired) {
          return desired.x;
        }
        return DEFAULT_POINT.x;
      })
    );
    simulation.force(
      "y",
      forceY((node) => {
        const desired = joinVardesiredPositions[node.id];
        if (desired) {
          return desired.y;
        }
        return DEFAULT_POINT.y;
      })
    );
    // simulation.force("charge", forceManyBody().strength(-50));

    // copy nodes into simulation
    simulation.nodes(Object.values(d3NodesByID));
    // slow down with a small alpha
    simulation.alpha(0.1).restart();

    // stop simulation on unmount
    return () => {
      simulation.stop();
    };
  }, [props.rule, dragState]);

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
            {mapObjToList(joinVardesiredPositions, (id, point) => {
              <circle cx={point.x} cy={point.y} r={2} />;
            })}
          </g>
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
            dispatch({ type: "AddConjunct", relationName });
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
          position: node.pos,
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
    case "Literal": {
      const value = props.nodeDesc.value;
      return (
        <TextWithBackground
          onContextMenu={(evt) => {
            evt.preventDefault();
            props.dispatchDelete();
          }}
          text={ppt(value)}
          textStyle={{
            fontFamily: "monospace",
            pointerEvents: "none",
            fill: value.type === "StringLit" ? "green" : "blue",
          }}
          rectStyle={{
            fill: "white",
          }}
          padding={5}
        />
      );
    }
  }
}

function reducer(action: NodeAction, context: Context, state: State): State {
  switch (action.type) {
    case "Delete": {
      const node = state.graph.nodes[action.id];
      const newConj: Conjunction = (() => {
        switch (node.desc.type) {
          case "Relation":
            if (node.desc.isHead) {
              return;
            }
            return removeConjunct(state.conjunction, parseInt(action.id));
          case "JoinVar":
            const newGraph = splitUpVar(context.rule, state.graph, action.id);
            return graphToConjunction(newGraph);
        }
      })();
      return {
        ...state,
        graph: conjunctionToGraph(context.rule.head, newConj),
        conjunction: newConj,
        dragState: null, // otherwise the node re-appears
      };
    }
    case "Drop": {
      if (!state.dragState) {
        return state;
      }
      const overlappingIDs = getOverlappingJoinVars(
        state.graph,
        state.dragState.nodeID
      );
      const newGraph = overlappingIDs.reduce((curGraph, overlappingID) => {
        const combined = combineNodes(
          curGraph,
          state.dragState.nodeID,
          overlappingID
        );
        return combined;
      }, state.graph);
      const newConj = graphToConjunction(newGraph);
      return {
        ...state,
        dragState: null,
        conjunction: newConj,
        graph: newGraph,
      };
    }
    case "StartDrag": {
      return {
        ...state,
        dragState: {
          nodeID: action.id,
          offset: action.offset,
          position: action.position,
        },
      };
    }
    case "Drag": {
      return {
        ...state,
        graph: updatePos(state.graph, state.dragState.nodeID, action.pos),
        dragState: { ...state.dragState, position: action.pos },
      };
    }
    case "AddConjunct": {
      const newConjunction = addConjunct(
        state.conjunction,
        context.rule,
        context.relations,
        action.relationName
      );
      return {
        ...state,
        selectorOption: "+",
        graph: conjunctionToGraph(context.rule.head, newConjunction),
        conjunction: newConjunction,
      };
    }
  }
}
