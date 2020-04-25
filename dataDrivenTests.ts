import { assertStringEqual, Suite } from "./testing";
import { Repl } from "./repl";
import * as stream from "stream";

export const dataDrivenTests: Suite = [
  {
    name: "foo",
    test() {
      const input = identityStream();
      const output = identityStream();
      const repl = new Repl(input, output, true, "");
      repl.run();

      const pairs = [
        {
          input: `father{child: "Pete", father: "Paul"}.`,
          output: `> `,
        },
        {
          input: `father{child: "Pete", father: F}.`,
          output: `father{child: "Pete", father: "Paul"}.
> `,
        },
      ];

      const initialPrompt = output.read();
      assertStringEqual("> ", initialPrompt.toString());
      for (const pair of pairs) {
        console.log("=> ", pair.input);
        input.write(pair.input + "\n");

        const chunk = output.read();
        console.log("<= ", chunk.toString());

        assertStringEqual(pair.output, chunk.toString());
      }
      input.end();
    },
  },
];

function identityStream(): stream.Transform {
  return new stream.Transform({
    transform(
      chunk: any,
      encoding: string,
      callback: (error?: Error | null, data?: any) => void
    ): void {
      callback(null, chunk);
    },
  });
}
