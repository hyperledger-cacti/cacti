import path from "path";
import { promisify } from "util";
import { spawn, exec } from "child_process";
import { v4 as uuidV4 } from "uuid";
import test, { Test } from "tape-promise/tape";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import * as publicApi from "../../../main/typescript/public-api";
import { SUPPLY_CHAIN_APP_OK_LOG_MSG_PATTERN } from "../../../main/typescript/public-api";

const testCase = "SupplyChainApp can launch via root package.json script";
const logLevel: LogLevelDesc = "TRACE";

test("BEFORE " + testCase, async (t: Test) => {
  const pruning = pruneDockerAllIfGithubAction({ logLevel });
  await t.doesNotReject(pruning, "Pruning did not throw OK");
  t.end();
});

async function psFilter(filter?: string): Promise<Map<number, string>> {
  const execAsync = promisify(exec);
  try {
    const { stdout } = await execAsync("ps -wo pid,cmd");
    const rows = stdout.split("\n");
    const map = new Map<number, string>();
    rows.forEach((row) => {
      const [pidStr, ...cmdParts] = row.split(" ");
      if (pidStr === "") {
        return;
      }
      const cmd = cmdParts.join(" ");
      console.log("pid=%o, cmd=%o", pidStr, cmd);
      const pid = parseInt(pidStr, 10);
      if (filter && cmd.includes(filter)) {
        map.set(pid, cmd);
      }
    });
    return map;
  } catch (e: unknown) {
    console.error("Crashed while running ps binary. Are you on Linux?", e);
    throw e;
  }
}

test(testCase, async (t: Test) => {
  t.ok(publicApi, "Public API of the package imported OK");
  test.onFinish(async () => await pruneDockerAllIfGithubAction({ logLevel }));

  const uuid = uuidV4();

  const projectRoot = path.join(__dirname, "../../../../../../");

  // used to find the processes to kill after we are done with the test
  const beaconCliArg = "--" + uuid;

  const child = spawn(
    "npm",
    ["run", "start:example-supply-chain", "--", beaconCliArg],
    {
      cwd: projectRoot,
    },
  );

  let apiIsHealthy = false;

  const childProcessPromise = new Promise<void>((resolve, reject) => {
    child.once("exit", (code: number, signal: NodeJS.Signals) => {
      t.comment(`EVENT:exit child process exited gracefully.`);
      t.comment(`EVENT:exit signal=${signal}`);
      t.comment(`EVENT:exit exitCode=${code}`);
      t.comment(`EVENT:exit apiIsHealthy=${apiIsHealthy}`);
      if (apiIsHealthy) {
        resolve();
      } else {
        const msg = `Child process crashed. exitCode=${code}, signal=${signal}`;
        reject(new Error(msg));
      }
    });
    child.on("close", (code: number, signal: NodeJS.Signals) => {
      t.comment(`EVENT:close signal=${signal}`);
      t.comment(`EVENT:close exitCode=${code}`);
    });
    child.on("disconnect", (code: number, signal: NodeJS.Signals) => {
      t.comment(`EVENT:disconnect signal=${signal}`);
      t.comment(`EVENT:disconnect exitCode=${code}`);
    });
    child.on("error", (ex: Error) => {
      t.comment(`EVENT:error ${ex.stack}`);
    });
  });

  const logs = [];
  for await (const data of child.stdout) {
    console.log(`[child]: ${data}`);
    if (data.includes(SUPPLY_CHAIN_APP_OK_LOG_MSG_PATTERN)) {
      console.log("Sending kill signal to child process...");
      apiIsHealthy = true;
      const killedOK = child.kill("SIGKILL");
      console.log("Sent kill signal, success=%o", killedOK);

      const processMap = await psFilter(uuid);
      processMap.forEach((v, k) => {
        console.log("Killing sub-process with pid: %o (cmd=%o) ", k, v);
        process.kill(k);
      });
      break;
    }
    logs.push(data);
  }

  await t.doesNotReject(childProcessPromise, "childProcessPromise resolves OK");

  t.end();

  process.exit(0);
});
