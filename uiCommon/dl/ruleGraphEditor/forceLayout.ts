import {
  forceSimulation,
  forceLink,
  forceX,
  forceY,
  forceManyBody,
} from "d3-force";
import { Point } from "../../../util/geom";
import { mapObj } from "../../../util/util";
import { DEFAULT_POINT } from "./convert";
import { DragState, RuleGraph } from "./model";

type D3Point = Point & { id: string; fx?: number; fy?: number };

export function forceLayout(
  graph: RuleGraph,
  dragState: DragState,
  setGraph: (g: RuleGraph) => void
) {
  const simulation = forceSimulation();

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

  simulation.force("links", linksForce);
  simulation.force("x", forceX(DEFAULT_POINT.x));
  simulation.force("y", forceY(DEFAULT_POINT.y));
  simulation.force("charge", forceManyBody().strength(-50));

  // copy nodes into simulation
  simulation.nodes(Object.values(d3NodesByID));
  // slow down with a small alpha
  simulation.alpha(0.1).restart();

  // stop simulation on unmount
  return () => {
    simulation.stop();
  };
}
