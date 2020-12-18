import loader from "assemblyscript/lib/loader";
import fs from "fs";

const file = fs.readFileSync("matGramp.wasm");

const lib = loader.instantiateSync(file, {});
const x = lib.exports.test();
console.log(x);

// console.log('   say :' , lib.getString(lib.say(lib.newString("oi"))))
// console.log('   say :' , lib.getString(lib.say(lib.newString("hi"))))
// console.log('   add :' , lib.add(100, 100))
// console.log(' teste :' , lib.getString(lib.teste()))
// console.log('method :' , lib.getString(x.teste()))
