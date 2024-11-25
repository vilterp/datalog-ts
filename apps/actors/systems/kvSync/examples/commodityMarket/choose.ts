import { randomFromList, randStep2 } from "../../../../../../util/util";
import { ClientState } from "../../client";
import { MutationInvocation } from "../../types";
import { OrderSide } from "./types";

export function choose(
  clients: {
    [id: string]: ClientState;
  },
  randomSeed: number
): [{ clientID: string; invocation: MutationInvocation } | null, number] {
  const [clientID, randomSeed1] = randomFromList(
    randomSeed,
    Object.keys(clients)
  );

  const [amount1, randomSeed2] = randStep2(randomSeed1);
  const [price, randomSeed3] = randStep2(randomSeed2);
  const side = randomFromList(randomSeed3, ["Buy", "Sell"])[0] as OrderSide;

  return [
    {
      clientID,
      invocation: {
        type: "Invocation",
        name: "Order",
        args: [Math.round(price * 100), Math.round(amount1 * 100), side],
      },
    },
    randomSeed3,
  ];
}
