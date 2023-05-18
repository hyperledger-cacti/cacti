import test, { Test } from "tape";
import { v4 as uuidv4 } from "uuid";
import { LoggerProvider } from "../../../../main/typescript/public-api";

// FIXME(2020-11-12) this does not work because for some reason the stdout
// stream does not emit 'data' events with anything even though it should.
// Suspecting that the test runner library does some internal magic with
// piping the stream somewhere else or similar foul play at hand.
// Until we can fix this, marked the test to be skipped.
test.skip("Logger#debug/error writes to stdout/stderr", async (t: Test) => {
  const log = LoggerProvider.getOrCreate({
    level: "TRACE",
    label: "logger-test",
  });

  // generate random UUID v4 to guarantee we don't mistake something else as the marker
  const marker = uuidv4();

  // wait for the marker to appear on stdout OR crash with timeout if it never comes
  let aggregateStdOut = "";
  let stdOutDataHandler;
  let didNotThrow: boolean;
  try {
    // hook up to the stdout data stream and wrap it in a promise that can be awaited
    // for when the marker does appear on stdout (which would be a passing test)
    // or when it times out (which would mean the test is failing).
    // Certain issues could happen here if the stream is chunking data and then you never
    // actually get the complete marker string at once but instead different parts of it
    // but I did not consider this because the uuid is only a few dozen bytes when stored as a hex string
    // so I'm pretty confident it wouldn't get chunked (probably not impossible either though so
    // if you are paranoid about that happening (which would make the test flaky) then you can
    // bake in some stream data aggregation instead where you collect and continually append
    // the incoming data chunks and test for marker presence in the aggregate variable not the chunk
    // that is provided in the 'data' event handler callback.
    await new Promise((resolve, reject) => {
      const timeoutMsg = "Timed out waiting for marker to appear on stdout";
      const timerId = setTimeout(() => reject(new Error(timeoutMsg)), 5000);

      stdOutDataHandler = (data: Buffer) => {
        const msg = data.toString("utf-8");
        aggregateStdOut = aggregateStdOut.concat(msg);
        if (msg.includes(marker)) {
          clearInterval(timerId);
          resolve(marker);
        }
      };

      process.stdout.on("data", stdOutDataHandler);

      // send the log now that we have hooked into the stream waiting for the marker to appear
      log.info(marker);
    });

    didNotThrow = true;
  } catch (ex) {
    didNotThrow = false;
  }

  process.stdout.off("data", stdOutDataHandler as any);
  t.comment(`Aggregate std out messages: ${aggregateStdOut}`);
  t.true(didNotThrow, "Marker appeared on stdout on time OK");

  t.end();
});
