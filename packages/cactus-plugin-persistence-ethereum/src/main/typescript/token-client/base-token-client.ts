/**
 * Base class for calling ethereum token contract methods.
 */

import {
  ContractJSON,
  DeployedContractJsonDefinition,
  EthContractInvocationType,
  EthereumApiClient,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";
import { getRuntimeErrorCause } from "../utils";

/**
 * Base class for calling ethereum token contract methods.
 * Can be extended by other, token specific classes.
 */
export default class TokenClient {
  protected contract: DeployedContractJsonDefinition;
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
    private apiClient: EthereumApiClient,
    abi: ContractJSON,
    address: string,
    logLevel: LogLevelDesc = "info",
  ) {
    const fnTag = `${TokenClient.CLASS_NAME}#constructor()`;
    Checks.truthy(apiClient, `${fnTag} arg verifierEthereum`);
    Checks.truthy(abi, `${fnTag} arg abi`);
    Checks.truthy(address, `${fnTag} arg address`);

    this.apiClient = apiClient;

    this.contract = {
      contractJSON: abi as ContractJSON,
      contractAddress: address,
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
   * @param type method execution type (only `call` supported for now)
   * @param method contract method name
   * @param ...args contract method arguments (any number)
   * @returns response from the method execution.
   */
  protected async contractMethod(
    type: EthContractInvocationType,
    method: string,
    ...args: unknown[]
  ): Promise<unknown> {
    this.log.debug(`Execute contract method ${method} using '${type}'`);

    if (type !== EthContractInvocationType.Call) {
      throw new Error("Only Call execution method is supported for now!");
    }

    try {
      const response = await this.apiClient.invokeContractV1({
        contract: this.contract,
        invocationType: type,
        methodName: method,
        params: args,
        web3SigningCredential: {
          // Credentials not needed when using "Call" execution method
          type: Web3SigningCredentialType.None,
        },
      });
      this.log.debug(
        "Executing contract method status:",
        response.statusText,
        "success:",
        response.data.success,
      );

      if (response.status != 200 || !response.data.success) {
        throw new Error(response.data.callOutput);
      }

      return response.data.callOutput;
    } catch (err: unknown) {
      throw new RuntimeError(
        `Calling contract method ${method} with args '${args}' failed`,
        getRuntimeErrorCause(err),
      );
    }
  }

  /**
   * Execute method on a contract using `call`
   *
   * @param method contract method name
   * @param ...args contract method arguments (any number)
   * @returns response from the method execution.
   */
  protected async callContractMethod(
    method: string,
    ...args: unknown[]
  ): Promise<unknown> {
    return await this.contractMethod(
      EthContractInvocationType.Call,
      method,
      ...args,
    );
  }
}
