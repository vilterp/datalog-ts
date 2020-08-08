import * as oboe from "oboe";
import * as fs from "fs";

const stream = oboe(process.stdin);

const nodes = fs.openSync("./nodes.csv", "w");
const edges = fs.openSync("./edges.csv", "w");
const strings = fs.openSync("./strings.csv", "w");

const COLS_NODES = 6;
const COLS_EDGES = 3;

stream.node(".nodes.*", (val, pathOrHeaders) => {
  // console.log(val, pathOrHeaders);
  const idx = parseInt(pathOrHeaders[1]);
  if (idx % COLS_NODES === 0 && idx > 0) {
    fs.writeSync(nodes, "\n");
  } else if (idx > 0) {
    fs.writeSync(nodes, ",");
  }
  fs.writeSync(nodes, val);
});

stream.node(".edges.*", (val, pathOrHeaders) => {
  // console.log(val, pathOrHeaders);
  const idx = parseInt(pathOrHeaders[1]);
  if (idx % COLS_EDGES === 0) {
    // console.log("hello", idx);
    if (idx > 0) {
      fs.writeSync(edges, "\n");
    }
    fs.writeSync(edges, `${idx / COLS_EDGES},`);
  } else {
    fs.writeSync(edges, ",");
  }
  fs.writeSync(edges, val);
});

stream.node(".strings.*", (val, pathOrHeaders) => {
  const idx = parseInt(pathOrHeaders[1]);
  fs.writeSync(strings, `${idx},"${escapeStr(val)}"\n`);
});

stream.done(() => {
  fs.closeSync(nodes);
  fs.closeSync(edges);
});

function escapeStr(s: string): string {
  return s.split(`"`).join(`""`);
}
