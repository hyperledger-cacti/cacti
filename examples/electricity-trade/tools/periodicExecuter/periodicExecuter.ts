/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * periodicExecuter.ts
 */

const { execSync } = require("child_process");

console.log("## start periodicExecuter");

if (process.argv.length !== 5 && process.argv.length !== 6) {
  console.log("Number of parameters is abnormal.");
  process.exit(-1);
}

const interval = parseInt(process.argv[2]);
const keyString = process.argv[3];
const valueAdd = process.argv[4];
const dockerExecString = "docker exec sawtooth-shell-default ";
const submitCommand =
  "sawtooth batch submit -f batches.intkey --url http://rest-api:8008";
const incCommand =
  "intkey create_batch --key-name " +
  keyString +
  " --value-inc-rand " +
  valueAdd;

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

const timerIdArowDown = setInterval(function () {
  console.log(`incCommand : ${incCommand}`);
  const stdoutInc = execSync(dockerExecString + incCommand);
  console.log(`incCommand stdout: ${stdoutInc.toString()}`);

  console.log(`submitCommand(inc) : ${submitCommand}`);
  const stdoutIncSubmit = execSync(dockerExecString + submitCommand);
  console.log(`submitCommand(inc) stdout: ${stdoutIncSubmit.toString()}`);

  console.log(`##${getCurrentTime()}  execute intkey`);
}, interval * 1000);

function getCurrentTime(): string {
  const now = new Date();
  return (
    "[" +
    now.getFullYear() +
    "/" +
    ("0" + (now.getMonth() + 1)).slice(-2) +
    "/" +
    ("0" + now.getDate()).slice(-2) +
    " " +
    ("0" + now.getHours()).slice(-2) +
    ":" +
    ("0" + now.getMinutes()).slice(-2) +
    ":" +
    ("0" + now.getSeconds()).slice(-2) +
    "]"
  );
}
