import { ppt } from "../../../core/pretty";
import { Res, Term } from "../../../core/types";
import { uniqBy } from "../../../util/util";

export type Grid = {
  grid: { [varName: string]: Term[] };
  vars: string[];
  longest: number;
};

export function buildGrid(vars: string[], results: Res[]): Grid {
  const grid: { [varName: string]: Term[] } = {};
  vars.forEach((varName) => {
    grid[varName] = [];
  });
  results.forEach((res) => {
    vars.forEach((varName) => {
      const term = res.bindings[varName];
      if (!term) {
        return;
      }
      grid[varName].push(term);
    });
  });
  let longest = 0;
  vars.forEach((varName) => {
    const unique = uniqBy(ppt, grid[varName]);
    grid[varName] = unique;
    if (unique.length > longest) {
      longest = unique.length;
    }
  });
  return { grid, longest, vars };
}
