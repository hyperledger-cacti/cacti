/**
 * Client for calling methods on ERC721 token contract.
 */

import { EthereumApiClient } from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import type { LogLevelDesc } from "@hyperledger/cactus-common";
import TokenClient from "./base-token-client";
import ERC721 from "../../json/contract-abi/ERC721.json";
import { RuntimeError } from "run-time-error-cjs";

/**
 * Client for calling methods on ERC721 token contract.
 */
export default class TokenClientERC721 extends TokenClient {
  public static readonly CLASS_NAME: string = "TokenClientERC721";

  /**
   * Get this class name
   * @returns class name string
   */
  getClassName(): string {
    return TokenClientERC721.CLASS_NAME;
  }

  constructor(
    apiClient: EthereumApiClient,
    public address: string,
    logLevel: LogLevelDesc = "info",
  ) {
    super(apiClient, ERC721, address, logLevel);
    this.log.debug("TokenClientERC721 created");
  }

  /**
   * Internal method for writing consistent log message describing operation executed.
   *
   * @param methodName Name of the method called.
   */
  private logOperation(methodName: string): void {
    this.log.info(
      `Call '${methodName}' on ERC721 contract at ${this.contract.contractAddress}`,
    );
  }

  /**
   * Get name of the token.
   * @returns token name
   */
  async name(): Promise<string> {
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
  async symbol(): Promise<string> {
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
   * Get owner of an issued token.
   * @param tokenId token id to check
   * @returns address of owner of the token
   */
  async ownerOf(tokenId: number): Promise<string> {
    this.logOperation("ownerOf");

    const response = await this.callContractMethod("ownerOf", tokenId);
    if (typeof response !== "string") {
      throw new RuntimeError(
        `Unexpected response type received for method 'ownerOf': ${response}`,
      );
    }

    return response;
  }

  /**
   * Get URI of an issued token.
   * @param tokenId token id to check
   * @returns URI of the token
   */
  async tokenURI(tokenId: number): Promise<string> {
    this.logOperation("tokenURI");

    const response = await this.callContractMethod("tokenURI", tokenId);
    if (typeof response !== "string") {
      throw new RuntimeError(
        `Unexpected response type received for method 'tokenURI': ${response}`,
      );
    }

    return response;
  }
}
