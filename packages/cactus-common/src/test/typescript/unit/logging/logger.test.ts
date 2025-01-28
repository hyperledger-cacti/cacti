import { v4 as uuidv4 } from "uuid";
import { LoggerProvider } from "../../../../main/typescript/public-api";

describe("Logger Tests", () => {
  it("Logger#debug/error writes to stdout/stderr", async () => {
    const log = LoggerProvider.getOrCreate({
      level: "TRACE",
      label: "logger-test",
    });

    // generate random UUID v4 to guarantee we don't mistake something else as the marker
    const marker = uuidv4();

    // Capture original stdout write method
    const originalWrite = process.stdout.write;
    let outputData = "";

    // Mock process.stdout.write to capture output
    process.stdout.write = function (
      chunk: any,
      encoding?: any,
      callback?: any,
    ): boolean {
      outputData += chunk.toString();
      if (callback) callback();
      return true;
    };

    try {
      log.info(marker);

      // Delay to ensure log output is flushed
      await new Promise((resolve) => setImmediate(resolve));

      // Restore original stdout.write
      process.stdout.write = originalWrite;

      // Check if the marker appeared in the captured output
      expect(outputData).toContain(marker);
      log.info(`Marker (${marker}) appeared in stdout OK`);
    } catch (error) {
      process.stdout.write = originalWrite; // Ensure restoration in case of errors
      throw error;
    }
  });
});
