/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Info, Returns, Transaction } from "fabric-contract-api";
import { ITraceableContract } from "./ITraceableContract";

import TokenERC20Contract from "./tokenERC20";
import { SATPContractInterface } from "./satp-contract-interface";

/**
 * @title SATPContract
 * The SATPContract is a example costum ERC20 token contract that implements the SATPContractInterface.
 */
@Info({
  title: "SATPContract",
  description: "SATP Costum ERC20 contract for trading asset",
})
export class SATPContract
  extends TokenERC20Contract
  implements ITraceableContract, SATPContractInterface
{
  constructor() {
    super("SATP-token");
  }

  /**
   * InitToken initializes the token contract.
   * @param ctx The transaction context.
   * @param owner The owner of the token.
   * @param id The id of the token.
   * @returns true if the token was initialized successfully.
   */
  @Transaction()
  public async InitToken(
    ctx: Context,
    owner: string,
    id: string,
  ): Promise<boolean> {
    await super.Initialize(ctx, "SATPContract", "SATP", "2");

    await ctx.stub.putState("ID", Buffer.from(id));
    await ctx.stub.putState("owner", Buffer.from(owner));
    return true;
  }

  /**
   * @notice Set the bridge MSPID and bridge ID.
   * So that the bridge can interact with the contract.
   * This is an example on how to give certain permissions to a bridge.
   * @param ctx The transaction context.
   * @param bridgeID The bridge ID.
   * @returns boolean
   */
  @Transaction()
  public async setBridge(ctx: Context, bridge: string): Promise<boolean> {
    this.checkPermission(ctx);
    await ctx.stub.putState("bridge", Buffer.from(bridge));
    return true;
  }

  @Transaction(false)
  @Returns("string")
  public async GetAllAssetsKey(ctx: Context): Promise<string> {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      allResults.push(result.value.key);
      result = await iterator.next();
    }
    return allResults.toString();
  }

  // GetAllTxByKey returns all transations for a specific key.
  @Transaction(false)
  @Returns("string")
  public async GetAllTxByKey(ctx: Context, key: string): Promise<string> {
    const allResults = [];
    const iterator = await ctx.stub.getHistoryForKey(key);
    let result = await iterator.next();
    while (!result.done) {
      const strValue = JSON.stringify(result);
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }

  /**
   * @notice Mint creates new tokens and assigns them to the owner.
   * @param ctx The transaction context.
   * @param amount The amount of tokens to mint.
   * @returns boolean
   */
  @Transaction()
  public async mint(ctx: Context, amount: string): Promise<boolean> {
    this.checkPermission(ctx);
    await super.Mint(ctx, amount);
    return true;
  }

  /**
   * @notice Burn destroys tokens from the owner.
   * @param ctx The transaction context.
   * @param amount The amount of tokens to burn.
   * @returns boolean
   */
  @Transaction()
  public async burn(ctx: Context, amount: string): Promise<boolean> {
    this.checkPermission(ctx);
    await this.Burn(ctx, amount);
    return true;
  }

  /**
   * @notice Assign transfers tokens from one account to another.
   * @param ctx The transaction context.
   * @param from The account to transfer tokens from.
   * @param to The account to transfer tokens to.
   * @param amount The amount of tokens to transfer.
   * @returns boolean
   */
  @Transaction()
  public async assign(
    ctx: Context,
    from: string,
    to: string,
    amount: string,
  ): Promise<boolean> {
    this.checkPermission(ctx);
    const clientID = await ctx.clientIdentity.getID();

    if (from !== clientID) {
      throw new Error(
        `client is not authorized to perform the operation. ${clientID} != ${from}`,
      );
    }
    await this._transfer(ctx, from, to, amount);
    return true;
  }

  /**
   * @notice TransferFrom transfers tokens from one account to another.
   * @param ctx The transaction context.
   * @param from The account to transfer tokens from.
   * @param to The account to transfer tokens to.
   * @param amount The amount of tokens to transfer.
   * @returns boolean
   */
  @Transaction()
  public async transferFrom(
    ctx: Context,
    from: string,
    to: string,
    amount: string,
  ): Promise<boolean> {
    this.checkPermission(ctx);
    await this.TransferFrom(ctx, from, to, amount);
    return true;
  }

  /**
   * @notice Transfer transfers tokens from one account to another.
   * @param ctx The transaction context.
   * @param to The account to transfer tokens to.
   * @param amount The amount of tokens to transfer.
   * @returns boolean
   */
  @Transaction()
  public async transfer(
    ctx: Context,
    to: string,
    amount: string,
  ): Promise<boolean> {
    this.checkPermission(ctx);
    await this.Transfer(ctx, to, amount);
    return true;
  }

  /**
   * @notice Checks if the client has permission to perform the operation.
   * @param ctx The transaction context.
   */
  private async checkPermission(ctx: Context) {
    let owner = await ctx.stub.getState("owner");
    let bridge = await ctx.stub.getState("bridge");

    owner = owner ? owner : Buffer.from("");

    bridge = bridge ? bridge : Buffer.from("");

    const clientMSPID = await ctx.clientIdentity.getMSPID();
    if (
      !(clientMSPID == owner.toString() || clientMSPID == bridge.toString())
    ) {
      throw new Error(
        `client is not authorized to perform the operation. ${clientMSPID}`,
      );
    }
  }

  /**
   * @notice Checks if the client has permission to perform the operation. This is an example on how to use the hasPermission function. It is to be used from the client side.
   * @param ctx The transaction context.
   * @param clientMSPID The MSPID of the client.
   */
  @Transaction()
  public async hasPermission(
    ctx: Context,
    clientMSPID: string,
  ): Promise<boolean> {
    let owner = await ctx.stub.getState("owner");
    let bridge = await ctx.stub.getState("bridge");

    owner = owner ? owner : Buffer.from("");

    bridge = bridge ? bridge : Buffer.from("");

    if (
      !(clientMSPID == owner.toString() || clientMSPID == bridge.toString())
    ) {
      throw new Error(
        `client is not authorized to perform the operation. ${clientMSPID}`,
      );
    }
    return true;
  }

  @Transaction(false)
  @Returns("string")
  /**
   * Retrieves the ID of the submitting client identity. This is necessary because fabric do not has an universal address.
   *
   * @param {Context} ctx - The transaction context.
   * @returns {Promise<string>} A promise that resolves to the client account ID.
   */
  async ClientAccountID(ctx: Context): Promise<string> {
    // Get ID of submitting client identity
    const clientAccountID: string = ctx.clientIdentity.getID();
    return clientAccountID;
  }
}
