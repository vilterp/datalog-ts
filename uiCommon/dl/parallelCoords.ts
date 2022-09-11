import { ppt } from "../../core/pretty";
import { Res, Term } from "../../core/types";
import { uniq, uniqBy } from "../../util/util";

// row, then col
export function buildGrid(
  vars: string[],
  results: Res[]
): { grid: { [varName: string]: Term[] }; longest: number } {
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
  console.log("buildGrid", grid, longest);
  return { grid, longest };
}
