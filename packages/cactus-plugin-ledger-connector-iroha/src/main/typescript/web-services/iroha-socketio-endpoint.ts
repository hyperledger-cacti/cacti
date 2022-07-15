import { Socket as SocketIoSocket } from "socket.io";

import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  RunTransactionRequestV1,
  IrohaCommand,
  IrohaBaseConfig,
} from "../generated/openapi/typescript-axios";
import {
  WatchBlocksV1,
  IrohaQuery,
} from "../generated/openapi/typescript-axios";

import {
  IrohaTransactionWrapper,
  IIrohaTransactionWrapperOptions,
} from "../iroha-transaction-wrapper";
export interface IIrohaSocketIOEndpoint {
  logLevel?: LogLevelDesc;
  socket: SocketIoSocket;
}

export class IrohaSocketIOEndpoint {
  public static readonly CLASS_NAME = "IrohaSocketIOEndpoint";

  private readonly log: Logger;
  private readonly socket: SocketIoSocket;
  private transaction: IrohaTransactionWrapper;
  private currentBlockHeight: number;
  private monitorModeEnabled: boolean;
  private monitoringInterval: any;

  public get className(): string {
    return IrohaSocketIOEndpoint.CLASS_NAME;
  }

  constructor(public readonly options: IIrohaSocketIOEndpoint) {
    const fnTag = `${this.className}#constructor()`;

    Checks.truthy(options, `${fnTag} arg options`);
    Checks.truthy(options.socket, `${fnTag} arg options.socket`);

    this.socket = options.socket;

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    const irohaOptions: IIrohaTransactionWrapperOptions = { logLevel: level };
    this.transaction = new IrohaTransactionWrapper(irohaOptions);
    this.currentBlockHeight = 1;
    this.monitorModeEnabled = false;
  }

  private createRequestBody(
    config: IrohaBaseConfig,
    methodName: string,
    params: Array<any>,
  ): RunTransactionRequestV1 {
    if (this.monitorModeEnabled === true) {
      config.monitorModeEnabled = this.monitorModeEnabled;
    }
    const requestBody = {
      commandName: methodName,
      params: params,
      baseConfig: config,
    };
    return requestBody;
  }

  private isLastBlockDetected(irohaResponse: unknown) {
    const irohaResponseStr = JSON.stringify(irohaResponse).replace(/\\/g, "");
    const responseMatch = irohaResponseStr.match(/Reason: ({.*?})/);
    if (!responseMatch || !responseMatch[1]) {
      this.log.debug(
        "Could not match error reason in response:",
        irohaResponseStr,
      );
      return false;
    }

    const responseObject = JSON.parse(responseMatch[1]);
    if (!responseObject) {
      this.log.debug(
        "Could not parse error object in response:",
        irohaResponseStr,
      );
      return false;
    }

    if (responseObject.reason === 1 && responseObject.errorCode === 3) {
      this.log.info(`Initial max block height is: ${this.currentBlockHeight}`);
      return true;
    } else {
      throw responseObject;
    }
  }

  private async getInitialMaxBlockHeight(requestData: any): Promise<void> {
    this.log.debug("Checking max block height...");
    const methodName: string = IrohaQuery.GetBlock;

    let args: Array<string | number>;
    let requestBody: RunTransactionRequestV1;

    try {
      while (true) {
        args = [this.currentBlockHeight];

        requestBody = this.createRequestBody(requestData, methodName, args);
        this.log.debug(`Iroha requestBody: ${requestBody}`);
        const response = await this.transaction.transact(requestBody);
        if (this.isLastBlockDetected(response.transactionReceipt)) {
          break;
        }
        this.currentBlockHeight++;
      }
    } catch (error) {
      if (!this.isLastBlockDetected(error)) {
        throw error;
      }
    }
  }

  private async monitoringRoutine(baseConfig: any) {
    try {
      const args = [this.currentBlockHeight];
      const methodName: string = IrohaQuery.GetBlock;
      this.log.debug(`Current block: ${this.currentBlockHeight}`);

      const requestBody = this.createRequestBody(baseConfig, methodName, args);
      const response = await this.transaction.transact(requestBody);

      if (this.isLastBlockDetected(response.transactionReceipt)) {
        this.log.debug("Waiting for new blocks...");
      } else {
        this.log.debug(`New block found`);
        const transactionReceipt = response.transactionReceipt;
        const next = { transactionReceipt };
        this.socket.emit(WatchBlocksV1.Next, next);
        this.currentBlockHeight++;
      }
    } catch (error) {
      if (this.isLastBlockDetected(error)) {
        this.log.debug("Waiting for new blocks...");
      } else {
        throw error;
      }
    }
  }

  public async startMonitor(monitorOptions: any): Promise<void> {
    this.log.debug(`${WatchBlocksV1.Subscribe} => ${this.socket.id}`);
    this.log.info(`Starting monitoring blocks...`);

    this.monitorModeEnabled = true;
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
    this.monitorModeEnabled = false;
    clearInterval(this.monitoringInterval);
  }

  public async sendRequest(requestData: any, async: boolean) {
    this.log.debug(`Inside ##sendRequest(), async = ${async}`);
    this.log.debug(`requestData: ${JSON.stringify(requestData, null, 4)}`);

    this.log.debug(requestData.methodName);
    this.log.debug(requestData.args);
    this.log.debug(requestData.baseConfig);

    if ((await this.validateMethodName(requestData.methodName)) === true) {
      const requestBody = this.createRequestBody(
        requestData.baseConfig,
        requestData.methodName,
        requestData.args,
      );

      const response = await this.transaction.transact(requestBody);
      this.log.debug(response);
      if (async) {
        return response;
      } else {
        try {
          this.socket.emit("response", response.transactionReceipt);
        } catch (err: unknown) {
          this.socket.emit("error", err);
        }
      }
    } else {
      const error = `Unrecognized method name: ${requestData.methodName}`;
      this.log.debug(error);
    }
  }
}
