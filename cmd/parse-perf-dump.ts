import * as oboe from "oboe";

const stream = oboe(process.stdin);

stream.node("!.*", (val, pathOrHeaders) => {
  const idx = pathOrHeaders[0];
  const row = [
    idx,
    escapeStr(val.name),
    escapeStr(val.cat),
    val.pid,
    val.tid,
    val.ts,
    val.tts,
    val.dur,
    val.tdur,
    escapeStr(JSON.stringify(val.args)),
  ];
  console.log(row.join(","));
});

function escapeStr(s: string): string {
  return `"${s.split(`"`).join(`""`)}"`;
}
