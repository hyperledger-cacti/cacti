/**
 * Client for calling methods on ERC1155 token contract.
 */

import { EthereumApiClient } from "@hyperledger-cacti/cactus-plugin-ledger-connector-ethereum";
import type { LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import TokenClient from "./base-token-client";
import ERC1155 from "../../json/contract-abi/ERC1155.json";
import { RuntimeError } from "run-time-error-cjs";

/**
 * Client for calling methods on ERC1155 token contract.
 */
export default class TokenClientERC1155 extends TokenClient {
  public static readonly CLASS_NAME: string = "TokenClientERC1155";

  /**
   * Get this class name
   * @returns class name string
   */
  getClassName(): string {
    return TokenClientERC1155.CLASS_NAME;
  }

  constructor(
    apiClient: EthereumApiClient,
    public address: string,
    logLevel: LogLevelDesc = "info",
  ) {
    super(
      apiClient,
      { abi: ERC1155, contractName: "ERC1155", bytecode: "0x" },
      address,
      logLevel,
    );
    this.log.debug("TokenClientERC1155 created");
  }

  /**
   * Internal method for writing consistent log message describing operation executed.
   *
   * @param methodName Name of the method called.
   */
  private logOperation(methodName: string): void {
    this.log.info(
      `Call '${methodName}' on ERC1155 contract at ${this.contract.contractAddress}`,
    );
  }

  /**
   * Get name of the token (optional for ERC1155, may not be implemented).
   * @returns token name or empty string if not implemented
   */
  async name(): Promise<string> {
    this.logOperation("name");

    try {
      const response = await this.callContractMethod("name");
      if (typeof response !== "string") {
        this.log.warn(
          `Unexpected response type for 'name': ${response}, returning empty string`,
        );
        return "";
      }
      return response;
    } catch (error) {
      this.log.warn(
        `Method 'name' not implemented on ERC1155 contract at ${this.address}, returning empty string`,
      );
      return "";
    }
  }

  /**
   * Get symbol of the token (optional for ERC1155, may not be implemented).
   * @returns token symbol or empty string if not implemented
   */
  async symbol(): Promise<string> {
    this.logOperation("symbol");

    try {
      const response = await this.callContractMethod("symbol");
      if (typeof response !== "string") {
        this.log.warn(
          `Unexpected response type for 'symbol': ${response}, returning empty string`,
        );
        return "";
      }
      return response;
    } catch (error) {
      this.log.warn(
        `Method 'symbol' not implemented on ERC1155 contract at ${this.address}, returning empty string`,
      );
      return "";
    }
  }

  /**
   * Get URI of a token.
   * @param tokenId token id to check
   * @returns URI of the token
   */
  async uri(tokenId: number): Promise<string> {
    this.logOperation("uri");

    const response = await this.callContractMethod("uri", tokenId);
    if (typeof response !== "string") {
      throw new RuntimeError(
        `Unexpected response type received for method 'uri': ${response}`,
      );
    }

    return response;
  }
}
