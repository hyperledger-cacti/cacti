/**
 * Base class for calling ethereum token contract methods.
 */

import type { SocketIOApiClient } from "@hyperledger/cactus-api-client";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error";
import { getRuntimeErrorCause } from "../utils";

export type EthereumContractMethodType =
  | "call"
  | "send"
  | "estimateGas"
  | "encodeABI";

/**
 * Base class for calling ethereum token contract methods.
 * Can be extended by other, token specific classes.
 */
export default class TokenClient {
  private apiClient: SocketIOApiClient;
  protected contract: { abi: unknown; address: string };
  protected log: Logger;
  public static readonly CLASS_NAME: string = "TokenClient";

  /**
   * Get this class name
   * @returns class name string
   */
  getClassName(): string {
    return TokenClient.CLASS_NAME;
  }

  constructor(
    apiClient: SocketIOApiClient,
    abi: unknown,
    address: string,
    logLevel: LogLevelDesc = "info",
  ) {
    const fnTag = `${TokenClient.CLASS_NAME}#constructor()`;
    Checks.truthy(apiClient, `${fnTag} arg verifierEthereum`);
    Checks.truthy(abi, `${fnTag} arg abi`);
    Checks.truthy(address, `${fnTag} arg address`);

    this.apiClient = apiClient;

    this.contract = {
      abi,
      address,
    };

    this.log = LoggerProvider.getOrCreate({
      level: logLevel,
      label: this.getClassName(),
    });
  }

  /**
   * Call specific contract method with some args.
   * Throws on error.
   *
   * @param type method execution type (`call`, `send`, etc...)
   * @param method contract method name
   * @param ...args contract method arguments (any number)
   * @returns response from the method execution.
   */
  protected async contractMethod(
    type: EthereumContractMethodType,
    method: string,
    ...args: unknown[]
  ): Promise<unknown> {
    this.log.debug(`Execute contract method ${method} using '${type}'`);

    try {
      const reqMethod = {
        type: "contract",
        command: method,
        function: type,
      };
      const reqArgs = { args: args };

      const response = await this.apiClient.sendSyncRequest(
        this.contract,
        reqMethod,
        reqArgs,
      );
      this.log.debug("Executing contract method status:", response.status);

      if (response.status != 200) {
        throw new Error(response);
      }

      return response.data;
    } catch (err: unknown) {
      throw new RuntimeError(
        `Calling contract method ${method} with args ${args} failed`,
        getRuntimeErrorCause(err),
      );
    }
  }

  /**
   * Execute method on a contract using `call`
   * @param method contract method name
   * @param ...args contract method arguments (any number)
   * @returns response from the method execution.
   */
  protected async callContractMethod(
    method: string,
    ...args: unknown[]
  ): Promise<unknown> {
    return await this.contractMethod("call", method, ...args);
  }

  /**
   * Execute method on a contract using `send`
   * @param method contract method name
   * @param ...args contract method arguments (any number)
   * @returns response from the method execution.
   */
  protected async sendContractMethod(
    method: string,
    ...args: unknown[]
  ): Promise<unknown> {
    return await this.contractMethod("send", method, ...args);
  }
}
