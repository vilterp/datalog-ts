import * as oboe from "oboe";

const col0 = process.argv[2];

const stream = oboe(process.stdin);

stream.node("..*", (val, pathOrHeaders) => {
  if (typeof val === "object") {
    return;
  }
  console.log(
    `${col0},${escapePath(pathOrHeaders.join("."))},${escape(`${val}`)}`
  );
});

function escapePath(str: string): string {
  return escape(str)
    .split(`=`)
    .join("_")
    .split(":")
    .join("_")
    .split("-")
    .join("_")
    .split(/[\(\) %]/)
    .join("_");
}

function escape(str: string): string {
  return `"${str.split(`"`).join(`'`)}"`;
}
