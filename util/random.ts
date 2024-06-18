import { randStep2, randomFromList } from "./util";

interface Generator<T> {
  choose(seed: number): [T, number];
}

export function list<T>(options: Generator<T>[]): Generator<T> {
  return {
    choose(seed: number): [T, number] {
      const [chosenGen, seed1] = randomFromList(seed, options);
      const [result, seed2] = chosenGen.choose(seed1);
      return [result, seed2];
    },
  };
}

export function numberBetween(min: number, max: number): Generator<number> {
  return {
    choose(seed: number): [number, number] {
      const [num01, seed1] = randStep2(seed);
      const res = num01 * (max - min) + min;
      return [res, seed1];
    },
  };
}

export function map<T, U>(gen: Generator<T>, f: (x: T) => U): Generator<U> {
  return {
    choose(seed: number): [U, number] {
      const [res, seed1] = gen.choose(seed);
      return [f(res), seed1];
    },
  };
}
