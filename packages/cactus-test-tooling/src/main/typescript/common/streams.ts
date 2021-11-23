import { Stream } from "stream";

export class Streams {
  public static aggregate<T>(
    stream: Stream,
    encoding:
      | "ascii"
      | "utf8"
      | "utf-8"
      | "utf16le"
      | "ucs2"
      | "ucs-2"
      | "base64"
      | "latin1"
      | "binary"
      | "hex"
      | undefined = "utf-8",
  ): Promise<T[]> {
    const data: T[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (buffer: Buffer) => {
        const item = buffer.toString(encoding) as any;
        data.push(item);
      });

      stream.on("error", (err: unknown) => {
        if (err instanceof Error) {
          reject(err);
        } else if (typeof err === "string") {
          reject(
            new Error(
              `Streams#aggregate() stream failed internally with: ${err}`,
            ),
          );
        } else {
          reject(
            new Error(
              `Streams#aggregate() stream failed internally with: ${JSON.stringify(
                err,
              )}`,
            ),
          );
        }
      });

      stream.on("end", () => {
        resolve(data);
      });
    });
  }

  public static aggregateToBuffer(stream: Stream): Promise<Buffer[]> {
    const fnTag = `Streams#aggregateToBuffer()`;
    const data: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (buffer: Buffer) => {
        data.push(buffer);
      });

      stream.on("error", (err: unknown) => {
        if (err instanceof Error) {
          reject(err);
        } else if (typeof err === "string") {
          reject(new Error(`${fnTag} stream failed with: ${err}`));
        } else {
          reject(
            new Error(`${fnTag} stream failed with: ${JSON.stringify(err)}`),
          );
        }
      });

      stream.on("end", () => {
        resolve(data);
      });
    });
  }
}
