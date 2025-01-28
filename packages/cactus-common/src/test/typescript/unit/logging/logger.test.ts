import { v4 as uuidv4 } from "uuid";
import { LoggerProvider } from "../../../../main/typescript/public-api";
import { Writable } from "stream";

describe("Logger Tests", () => {
  it("Logger#debug/error writes to stdout/stderr", async () => {
    const outputData: string[] = [];
    const customStream = new Writable({
      write(chunk, encoding, callback) {
        outputData.push(chunk.toString());
        callback();
      },
    });

    const log = LoggerProvider.getOrCreate({
      level: "TRACE",
      label: "logger-test",
      stream: customStream,
    });

    // generate random UUID v4 to guarantee we don't mistake something else as the marker
    const marker = uuidv4();
    log.info(marker);

    // Delay verification to ensure all writes are flushed
    await new Promise((resolve) => setImmediate(resolve));

    // Verify marker in output
    const capturedOutput = outputData.join("");
    expect(capturedOutput).toContain(marker);
    log.info(`Marker (${marker}) appeared in custom stream output`);
  });
});
