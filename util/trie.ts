import { Tree } from "./tree";
import { lastItem, objToPairs } from "./util";

// TODO: generic `item` member?
export type TrieNode = {
  children: { [name: string]: TrieNode };
};

type Path = string[];

export function buildTrie(paths: Path[]): TrieNode {
  const out: TrieNode = { children: {} };
  paths.forEach((path) => {
    trieInsert(out, path);
  });
  return out;
}

function trieInsert(trie: TrieNode, path: Path) {
  if (path.length === 0) {
    return;
  }
  const segment = path[0];
  if (!trie.children[segment]) {
    trie.children[segment] = { children: {} };
  }
  trieInsert(trie.children[segment], path.slice(1));
}

export function trieToTree(trie: TrieNode): Tree<string> {
  return trieToTreeRecur(trie, []);
}

function trieToTreeRecur(trie: TrieNode, path: string[]): Tree<string> {
  return {
    key: path.join("/"),
    item: lastItem(path),
    children: objToPairs(trie.children).map(([key, value]) =>
      trieToTreeRecur(value, path.concat([key]))
    ),
  };
}
