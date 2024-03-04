import {
  NodeSSH,
  SSHExecCommandOptions,
  SSHExecCommandResponse,
} from "node-ssh";
import { RuntimeError } from "run-time-error-cjs";

import { Logger } from "@hyperledger/cactus-common";

import { isSshExecOk } from "./is-ssh-exec-ok";

export async function sshExec(
  ctx: { readonly log: Logger },
  cmd: string,
  label: string,
  ssh: NodeSSH,
  sshCmdOptions: SSHExecCommandOptions,
): Promise<SSHExecCommandResponse> {
  ctx.log.debug(`${label} CMD: ${cmd}`);
  const cmdRes = await ssh.execCommand(cmd, sshCmdOptions);
  ctx.log.debug(`${label} CMD Response .code: %o`, cmdRes.code);
  ctx.log.debug(`${label} CMD Response .signal: %o`, cmdRes.signal);
  ctx.log.debug(`${label} CMD Response .stderr: %s`, cmdRes.stderr);
  ctx.log.debug(`${label} CMD Response .stdout: %s`, cmdRes.stdout);

  if (!isSshExecOk(cmdRes)) {
    throw new RuntimeError(`Expected ${label} cmdRes.code as null or 0`);
  }
  return cmdRes;
}
