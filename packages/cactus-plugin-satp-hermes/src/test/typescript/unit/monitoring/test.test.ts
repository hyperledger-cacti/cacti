import net from "net";
import {
  startDockerComposeService,
  stopDockerComposeService,
} from "../../test-utils";

function waitForPort(port: number, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const socket = new net.Socket();
      socket
        .setTimeout(1000)
        .once("error", () => retry())
        .once("timeout", () => retry())
        .connect(port, "localhost", () => {
          socket.end();
          resolve();
        });

      function retry() {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(check, 500);
        }
      }
    };

    check();
  });
}

beforeAll(async () => {
  startDockerComposeService("otel-lgtm");
  await Promise.all([waitForPort(4000), waitForPort(4317), waitForPort(4318)]);
}, 30000); // extended timeout

afterAll(() => {
  stopDockerComposeService("otel-lgtm");
});

test("otel-lgtm ports are open", async () => {
  // If we got here, ports are up. You can optionally do further HTTP checks.
  expect(true).toBe(true);
});
