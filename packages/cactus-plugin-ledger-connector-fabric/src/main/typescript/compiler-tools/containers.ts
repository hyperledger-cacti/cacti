import { Logger } from "@hyperledger-cacti/cactus-common";
import { Container } from "dockerode";
export interface IStreamLogsRequest {
  readonly container: Container;
  readonly log: Logger;
  readonly tag: string;
}

export async function streamLogs(req: IStreamLogsRequest): Promise<void> {
  const logOptions = { follow: true, stderr: true, stdout: true };
  const logStream = await req.container.logs(logOptions);
  const newLineOnlyLogMessages = [`\r\n`, `+\r\n`, `.\r\n`];

  logStream.on("data", (data: Buffer) => {
    const msg = data.toString("utf-8");
    if (!newLineOnlyLogMessages.includes(msg)) {
      req.log.debug(`${req.tag} %o`, msg);
    }
  });
}
