import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { LoggerProvider } from "../../../../main/typescript/public-api";

test.skip("Logger#debug/error writes to stdout/stderr", async (t: Test) => {
  const log = LoggerProvider.getOrCreate({
    level: "TRACE",
    label: "logger-test",
  });

  const marker = uuidv4();

  let aggregateStdOut = "";
  let didNotThrow: boolean;
  let stdOutDataHandler;

  try {
    async function waitUntilMarkerAppears() {
      return new Promise((resolve, reject) => {
        const timeoutMsg = "Timed out waiting for marker to appear on stdout";
        const timerId = setTimeout(() => reject(new Error(timeoutMsg)), 5000);

        stdOutDataHandler = (data: Buffer) => {
          const msg = data.toString("utf-8");
          aggregateStdOut = aggregateStdOut.concat(msg);
          if (msg.includes(marker)) {
            clearInterval(timerId);
            process.stdout.off("data", stdOutDataHandler);
            resolve();
          }
        };

        process.stdout.on("data", stdOutDataHandler);

        log.info(marker);
      });
    }

    await waitUntilMarkerAppears();
    didNotThrow = true;
  } catch (ex) {
    didNotThrow = false;
  }

  t.comment(`Aggregate std out messages: ${aggregateStdOut}`);
  t.true(didNotThrow, "Marker appeared on stdout on time OK");

  t.end();
});
