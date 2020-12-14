import * as fs from "fs/promises";
import * as path from "path";
import { DDTest } from "./types";
import { parseDDTest } from "./parser";

type Archive = { [path: string]: DDTest };

async function* walk(dir) {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

// Then, use it with a simple async for loop
async function main(archivePath: string) {
  const archive: Archive = {};
  for await (const path of walk(".")) {
    if (path.endsWith(".dd.txt")) {
      archive[path] = parseDDTest((await fs.readFile(path)).toString());
    }
  }
  await fs.writeFile(archivePath, JSON.stringify(archive));
}

const archivePath = "test-archive.dd.json";
main(archivePath).then(() => {
  console.log(`archive written to ${archivePath}`);
});
