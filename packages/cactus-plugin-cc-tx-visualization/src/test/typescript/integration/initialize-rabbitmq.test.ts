import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { RabbitMQTestServer } from "@hyperledger/cactus-test-tooling";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";

const testCase = "Instantiate plugin";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning didn't throw OK");
  t.end();
});

test(testCase, async (t: Test) => {
  const options = {
    publishAllPorts: true,
    port: 5672,
    logLevel: logLevel,
    imageName: "rabbitmq",
    imageTag: "3.9-management",
    emitContainerLogs: true,
    envVars: new Map([["AnyNecessaryEnvVar", "Can be set here"]]),
  };

  const testServer = new RabbitMQTestServer(options);
  const tearDown = async () => {
    await testServer.stop();
    // Destruction occurs when the RabbitMQ stops and has no listening connections
    //await testServer.destroy();
    await pruneDockerAllIfGithubAction({ logLevel });
  };

  test.onFinish(tearDown);
  await testServer.start();
  t.ok(testServer);
  //await new Promise((resolve) => setTimeout(resolve, 3000));
  t.end();
});
