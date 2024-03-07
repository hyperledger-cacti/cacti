/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * periodicExecuter.ts
 */

import { execSync } from "child_process";

console.log("## start periodicExecuter");

if (process.argv.length !== 5 && process.argv.length !== 6) {
  console.log("Number of parameters is abnormal.");
  process.exit(-1);
}

const keyString = process.argv[3];
const dockerExecString = "docker exec sawtooth-shell-default ";
const submitCommand =
  "sawtooth batch submit -f batches.intkey --url http://rest-api:8008";

if (process.argv.length === 6) {
  const valueInitial = process.argv[5];

  const setCommand =
    "intkey create_batch --key-name " +
    keyString +
    " --value-set " +
    valueInitial;
  console.log(`setCommand : ${setCommand}`);
  const stdoutSet = execSync(dockerExecString + setCommand);
  console.log(`setCommand stdout: ${stdoutSet.toString()}`);

  console.log(`submitCommand(set) : ${submitCommand}`);
  const stdoutSetSubmit = execSync(dockerExecString + submitCommand);
  console.log(`submitCommand(set) stdout: ${stdoutSetSubmit.toString()}`);
}
