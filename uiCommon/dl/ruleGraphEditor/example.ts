import { RuleGraph } from "./types";

export const INITIAL_GRAPH: RuleGraph = {
  nodes: {
    0: {
      pos: {
        x: 100,
        y: 70,
      },
      desc: { type: "Relation", name: "parent" },
    },
    1: {
      pos: {
        x: 40,
        y: 70,
      },
      desc: { type: "JoinVar" },
    },
    2: {
      pos: {
        x: 150,
        y: 70,
      },
      desc: { type: "JoinVar" },
    },
    3: {
      pos: {
        x: 100,
        y: 120,
      },
      desc: { type: "Relation", name: "ancestor" },
    },
    4: {
      pos: {
        x: 40,
        y: 120,
      },
      desc: { type: "JoinVar" },
    },
    5: {
      pos: {
        x: 150,
        y: 120,
      },
      desc: { type: "JoinVar" },
    },
  },
  edges: [
    { fromID: "0", toID: "1" },
    { fromID: "0", toID: "2" },
    { fromID: "3", toID: "4" },
    { fromID: "4", toID: "5" },
  ],
};
