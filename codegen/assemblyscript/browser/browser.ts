import loader from "assemblyscript/lib/loader";

async function main() {
  const resp = await fetch("matGramp.wasm");
  const module = await loader.instantiateStreaming(resp);
  const res = module.exports.test();
  console.log(res);
}

main().then(() => console.log("done"));
