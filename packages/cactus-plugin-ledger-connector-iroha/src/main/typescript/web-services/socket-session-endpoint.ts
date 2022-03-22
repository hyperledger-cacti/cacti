import { Socket as SocketIoSocket } from "socket.io";

import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  RunTransactionRequestV1,
  RunTransactionResponse,
  IrohaBlockProgress,
  IrohaCommand,
  IrohaBaseConfig,
} from "../generated/openapi/typescript-axios";
import {
  IrohaSocketSession,
  IrohaQuery,
} from "../generated/openapi/typescript-axios";

import { Transaction } from "../transaction";
export interface IWatchBlocksV1EndpointOptions {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
}

export class SocketSessionEndpoint {
  public static readonly CLASS_NAME = "SocketSessionEndpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket;
  private transaction: Transaction;
  private currentBlockHeight: number;
  private monitorMode: boolean;
  private monitoringInterval: any;

  public get className(): string {
    return SocketSessionEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IWatchBlocksV1EndpointOptions) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.socket, `${fnTag} arg options.socket`);

    this.socket = options.socket;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });
    this.transaction = new Transaction(level);
    this.currentBlockHeight = 1;
    this.monitorMode = false;
  }

  private createRequestBody(
    config: IrohaBaseConfig,
    methodName: string,
    params: Array<any>,
  ): RunTransactionRequestV1 {
    if (this.monitorMode === true) {
      config.monitorMode = this.monitorMode;
    }
    const requestBody = {
      commandName: methodName,
      params: params,
      baseConfig: config,
    };
    return requestBody;
  }

  private async getInitialMaxBlockHeight(requestData: any): Promise<void> {
    this.log.debug("Checking max block height...");
    const methodName: string = IrohaQuery.GetBlock;

    let args: Array<string | number>;
    let requestBody: RunTransactionRequestV1;
    let response: RunTransactionResponse;
    let str_response: string;

    while (true) {
      args = [this.currentBlockHeight];

      requestBody = this.createRequestBody(requestData, methodName, args);
      this.log.debug(`Iroha requestBody: ${requestBody}`);

      response = await this.transaction.transact(requestBody);
      str_response = String(response.transactionReceipt);

      if (str_response.includes("Query response error")) {
        if (str_response.includes(`"errorCode":3`)) {
          this.log.info(
            `Initial max block height is: ${this.currentBlockHeight}`,
          );
          break;
        } else {
          this.log.error(`Runtime error caught: ${str_response}`);
          break;
        }
      }
      this.currentBlockHeight++;
    }
  }

  private async monitoringRoutine(baseConfig: any) {
    let transactionReceipt: any;
    let next: IrohaBlockProgress;

    const args = [this.currentBlockHeight];
    const methodName: string = IrohaQuery.GetBlock;
    this.log.debug(`Current block: ${this.currentBlockHeight}`);

    const requestBody = this.createRequestBody(baseConfig, methodName, args);
    const response = await this.transaction.transact(requestBody);
    const str_response = String(response.transactionReceipt);

    if (str_response.includes("Query response error")) {
      if (str_response.includes(`"errorCode":3`)) {
        this.log.debug("Waiting for new blocks...");
      } else {
        this.log.error(`Runtime error caught: ${str_response}`);
      }
    } else {
      this.log.debug(`New block found`);
      transactionReceipt = response.transactionReceipt;
      next = { transactionReceipt };
      this.socket.emit(IrohaSocketSession.Next, next);
      this.currentBlockHeight++;
    }
  }

  public async startMonitor(monitorOptions: any): Promise<void> {
    this.log.debug(`${IrohaSocketSession.Subscribe} => ${this.socket.id}`);
    this.log.info(`Starting monitoring blocks...`);

    this.monitorMode = true;
    await this.getInitialMaxBlockHeight(monitorOptions.baseConfig);

    this.monitoringInterval = setInterval(() => {
      this.monitoringRoutine(monitorOptions.baseConfig);
    }, monitorOptions.pollTime);
  }

  private async validateMethodName(methodName: string): Promise<boolean> {
    let isValidMethod = false;

    if (Object.values(IrohaQuery as any).includes(methodName)) {
      this.log.debug(`Method name: ${methodName} (IrohaQuery) is valid`);
      isValidMethod = true;
    }
    if (Object.values(IrohaCommand as any).includes(methodName)) {
      this.log.debug(`Method name: ${methodName} (IrohaCommand) is valid`);
      isValidMethod = true;
    }
    return isValidMethod;
  }

  public async stopMonitor(): Promise<void> {
    this.log.info(`Stopping monitor...`);
    this.monitorMode = false;
    clearInterval(this.monitoringInterval);
  }

  public async sendAsyncRequest(asyncRequestData: any): Promise<any> {
    this.log.debug(`Inside ##sendAsyncRequest()`);
    this.log.debug(
      `asyncRequestData: ${JSON.stringify(asyncRequestData, null, 4)}`,
    );

    this.log.debug(asyncRequestData.methodName);
    this.log.debug(asyncRequestData.args);
    this.log.debug(asyncRequestData.baseConfig);

    // Validate method name
    if ((await this.validateMethodName(asyncRequestData.methodName)) === true) {
      const requestBody = this.createRequestBody(
        asyncRequestData.baseConfig,
        asyncRequestData.methodName,
        asyncRequestData.args,
      );

      const response = await this.transaction.transact(requestBody);
      if (asyncRequestData?.syncRequest) {
        this.log.debug(response);
        return response;
      }
    } else {
      const error = `Unrecognized method name: ${asyncRequestData.methodName}`;
      this.log.debug(error);
    }
  }

  public async sendSyncRequest(syncRequestData: any): Promise<void> {
    this.log.debug(`Inside ##sendSyncRequest()`);

    syncRequestData["syncRequest"] = true;

    try {
      const block = await this.sendAsyncRequest(syncRequestData);
      this.log.debug(block);
      this.socket.emit("response", block.transactionReceipt);
    } catch (err: any) {
      this.socket.emit("error", err);
    }
  }
}
