/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Context,
  Info,
  Returns,
  Transaction,
  Contract,
} from "fabric-contract-api";
import { ITraceableContract } from "./ITraceableContract";

import { Token } from "./token";

@Info({
  title: "SATPContractWrapper",
  description: "SATP Wrapper contract for trading assets",
})
export class SATPContractWrapper
  extends Contract
  implements ITraceableContract
{
  constructor() {
    super();
  }

  @Transaction()
  public async Initialize(ctx: Context, owner: string): Promise<boolean> {
    await ctx.stub.putState("owner", Buffer.from(owner));
    return true;
  }

  @Transaction()
  public async setBridge(ctx: Context, bridge: string): Promise<boolean> {
    this.checkPermission(ctx);
    await ctx.stub.putState("bridge", Buffer.from(bridge));
    return true;
  }

  @Transaction()
  public async getToken(ctx: Context, tokenId: string): Promise<Token> {
    const valueBytes: Uint8Array = await ctx.stub.getState(tokenId);

    if (!valueBytes || valueBytes.length === 0) {
      throw new Error(`Asset with ID ${tokenId} does not exist`);
    }

    return JSON.parse(valueBytes.toString()) as Token;
  }

  @Transaction()
  @Returns("boolean")
  public async wrap(
    ctx: Context,
    tokenType: string,
    tokenId: string,
    owner: string,
    mspId: string,
    channelName: string,
    contractName: string,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const valueBytes = await ctx.stub.getState(tokenId);

    const bridge = await ctx.stub.getState("bridge");

    if (valueBytes && valueBytes.length > 0) {
      throw new Error(
        `Asset with ID ${tokenId} is already wrapped ${valueBytes.toString()}`,
      );
    }

    if (!bridge || bridge.length === 0) {
      throw new Error(`Bridge is not set`);
    }

    const hasPermission = await ctx.stub.invokeChaincode(
      contractName,
      ["hasPermission", bridge.toString()],
      channelName,
    );

    if (hasPermission.status !== 200) {
      throw new Error(
        `Wrapper does not have permission to the asset mspID: ${ctx.stub.getMspID()}\n ${hasPermission.message}`,
      );
    }

    const token: Token = {
      tokenType: tokenType,
      tokenId: tokenId,
      owner: owner,
      mspId: mspId,
      channelName: channelName,
      contractName: contractName,
      amount: 0,
    };

    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(token)));
    return true;
  }

  @Transaction()
  @Returns("boolean")
  public async unwrap(ctx: Context, tokenId: string): Promise<boolean> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    if (token.amount > 0) {
      throw new Error("Token has locked amount");
    }

    await ctx.stub.deleteState(tokenId);
    return true;
  }

  @Transaction()
  @Returns("number")
  public async lockedAmount(ctx: Context, tokenId: string): Promise<number> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    return token.amount;
  }

  @Transaction()
  @Returns("boolean")
  public async lock(
    ctx: Context,
    tokenId: string,
    amount: number,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    const to = await ctx.clientIdentity.getID();

    const lockResponse = await ctx.stub.invokeChaincode(
      token.contractName,
      ["transferFrom", token.owner, to, amount.toString()],
      token.channelName,
    );

    if (lockResponse.status !== 200) {
      throw new Error(`Lock failed ${lockResponse.message}`);
    }

    token.amount += amount;

    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(token)));
    return true;
  }

  @Transaction()
  public async unlock(
    ctx: Context,
    tokenId: string,
    amount: number,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    if (token.amount < amount) {
      throw new Error(
        "No sufficient amount locked, total tried to unlock: " +
          amount +
          " total locked: " +
          token.amount,
      );
    }

    const unlockResponse = await ctx.stub.invokeChaincode(
      token.contractName,
      ["transfer", token.owner, amount.toString()],
      token.channelName,
    );

    if (unlockResponse.status !== 200) {
      throw new Error(`Unlock failed: ${unlockResponse.message}`);
    }

    token.amount -= amount;

    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(token)));
    return true;
  }

  @Transaction()
  @Returns("boolean")
  public async mint(
    ctx: Context,
    tokenId: string,
    amount: number,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    const mintResponse = await ctx.stub.invokeChaincode(
      token.contractName,
      ["mint", amount.toString()],
      token.channelName,
    );

    if (mintResponse.status !== 200) {
      throw new Error(`Mint failed: ${mintResponse.message}`);
    }

    token.amount += amount;

    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(token)));
    return true;
  }

  @Transaction()
  @Returns("boolean")
  public async burn(
    ctx: Context,
    tokenId: string,
    amount: number,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    if (token.amount < amount) {
      throw new Error("No sufficient amount locked");
    }

    const burnResponse = await ctx.stub.invokeChaincode(
      token.contractName,
      ["burn", amount.toString()],
      token.channelName,
    );

    if (burnResponse.status !== 200) {
      throw new Error(`Burn failed: ${burnResponse.message}`);
    }

    token.amount -= amount;

    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(token)));
    return true;
  }

  @Transaction()
  @Returns("boolean")
  public async assign(
    ctx: Context,
    tokenId: string,
    to: string,
    amount: number,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    if (token.amount < amount) {
      throw new Error("No sufficient amount locked");
    }

    const from = await ctx.clientIdentity.getID();

    const assignResponse = await ctx.stub.invokeChaincode(
      token.contractName,
      ["assign", from, to, amount.toString()],
      token.channelName,
    );

    if (assignResponse.status !== 200) {
      throw new Error(`Assign failed: ${assignResponse.message}`);
    }

    token.amount -= amount;

    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(token)));
    return true;
  }

  @Transaction(false)
  @Returns("string")
  public async GetAsset(ctx: Context, id: string): Promise<string> {
    const assetBytes = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!assetBytes || assetBytes.length === 0) {
      throw new Error(`Asset with key ${id} does not exist`);
    }
    return JSON.parse(assetBytes.toString());
  }

  // GetAllAssetsKey returns all assets key found in the world state.
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

  // add two number checking for overflow
  add(a, b) {
    const c = a + b;
    if (a !== c - b || b !== c - a) {
      throw new Error(`Math: addition overflow occurred ${a} + ${b}`);
    }
    return c;
  }

  // add two number checking for overflow
  sub(a, b) {
    const c = a - b;
    if (a !== c + b || b !== a - c) {
      throw new Error(`Math: subtraction overflow occurred ${a} - ${b}`);
    }
    return c;
  }

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
        `wrapper: client is not authorized to perform the operation. ${clientMSPID}`,
      );
    }
  }

  @Transaction(false)
  @Returns("string")
  async ClientAccountID(ctx: Context): Promise<string> {
    // Get ID of submitting client identity
    const clientAccountID: string = ctx.clientIdentity.getID();
    return clientAccountID;
  }
}
