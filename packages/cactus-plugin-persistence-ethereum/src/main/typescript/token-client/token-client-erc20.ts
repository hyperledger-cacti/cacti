/**
 * Client for calling methods on ERC20 token contract.
 */

import type { SocketIOApiClient } from "@hyperledger/cactus-api-client";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import TokenClient from "./base-token-client";
import ERC20_ABI from "../../json/contract_abi/Erc20Token.json";
import { RuntimeError } from "run-time-error";

/**
 * Client for calling methods on ERC20 token contract.
 */
export default class TokenClientERC20 extends TokenClient {
  public static readonly CLASS_NAME: string = "TokenClientERC20";

  /**
   * Get this class name
   * @returns class name string
   */
  getClassName(): string {
    return TokenClientERC20.CLASS_NAME;
  }

  constructor(
    apiClient: SocketIOApiClient,
    address: string,
    logLevel: LogLevelDesc = "info",
  ) {
    super(apiClient, ERC20_ABI, address, logLevel);
    this.log.debug("TokenClientERC20 created");
  }

  /**
   * Internal method for writing consistent log message describing operation executed.
   *
   * @param methodName Name of the method called.
   */
  private logOperation(methodName: string): void {
    this.log.info(
      `Call '${methodName}' on ERC20 contract at ${this.contract.address}`,
    );
  }

  /**
   * Get name of the token.
   * @returns token name
   */
  public async name(): Promise<string> {
    this.logOperation("name");

    const response = await this.callContractMethod("name");
    if (typeof response !== "string") {
      throw new RuntimeError(
        `Unexpected response type received for method 'name': ${response}`,
      );
    }

    return response;
  }

  /**
   * Get symbol of the token.
   * @returns token symbol
   */
  public async symbol(): Promise<string> {
    this.logOperation("symbol");

    const response = await this.callContractMethod("symbol");
    if (typeof response !== "string") {
      throw new RuntimeError(
        `Unexpected response type received for method 'symbol': ${response}`,
      );
    }

    return response;
  }

  /**
   * Get total supply of the token.
   * @returns token total supply
   */
  public async totalSupply(): Promise<string> {
    this.logOperation("totalSupply");

    const response = await this.callContractMethod("totalSupply");
    if (typeof response !== "string") {
      throw new RuntimeError(
        `Unexpected response type received for method 'totalSupply': ${response}`,
      );
    }

    return response;
  }
}
