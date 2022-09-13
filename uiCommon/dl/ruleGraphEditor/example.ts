import { RuleGraph } from "./model";

export const INITIAL_GRAPH: RuleGraph = {
  nodes: {
    // parent conjunct
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
    // ancestor conjunct
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
    // head
    6: {
      pos: {
        x: 100,
        y: 30,
      },
      desc: { type: "Relation", name: "ancestor" },
    },
    7: {
      pos: {
        x: 40,
        y: 30,
      },
      desc: { type: "JoinVar" },
    },
    8: {
      pos: {
        x: 150,
        y: 30,
      },
      desc: { type: "JoinVar" },
    },
  },
  edges: [
    // parent conjunct
    { fromID: "0", toID: "1" },
    { fromID: "0", toID: "2" },
    // ancestor conjunct
    { fromID: "3", toID: "4" },
    { fromID: "3", toID: "5" },
    // head
    { fromID: "6", toID: "7" },
    { fromID: "6", toID: "8" },
  ],
};
