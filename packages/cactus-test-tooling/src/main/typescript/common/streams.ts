import { Stream } from "stream";

export class Streams {
  public static aggregate<T>(stream: Stream): Promise<T[]> {
    const data: T[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (buffer: Buffer) => {
        const item = buffer.toString("utf-8") as any;
        data.push(item);
      });

      stream.on("error", (err: any) => {
        if (err instanceof Error) {
          reject(err);
        } else if (typeof err === "string") {
          reject(
            new Error(
              `Streams#aggregate() stream failed internally with: ${err}`
            )
          );
        } else {
          reject(
            new Error(
              `Streams#aggregate() stream failed internally with: ${JSON.stringify(
                err
              )}`
            )
          );
        }
      });

      stream.on("end", () => {
        resolve(data);
      });
    });
  }
}
