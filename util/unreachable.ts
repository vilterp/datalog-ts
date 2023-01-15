export function unreachable(thing: never) {
  throw new Error("reached unreachable code");
}
