import * as stream from "stream";

export function identityTransform(): stream.Transform {
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

export function readAll(s: stream.Readable): string {
  let out = "";
  while (true) {
    const chunk = s.read();
    if (chunk === null) {
      break;
    }
    out += chunk.toString();
  }
  return out;
}
