import { SSHExecCommandResponse } from "node-ssh";
import { RuntimeError } from "run-time-error-cjs";

export function isSshExecOk(res: SSHExecCommandResponse): boolean {
  const fnTag = "isSshExecOk()";
  if (!res) {
    throw new RuntimeError(`${fnTag} expected arg res to be truthy.`);
  }
  return res.code === null || res.code === 0;
}
