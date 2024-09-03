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
import {
  InteractionSignatureType,
  VarType,
  InteractionSignature,
} from "./interaction-signature";

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
  public async Initialize(ctx: Context, ownerMSPID: string): Promise<boolean> {
    await ctx.stub.putState("ownerMSPID", Buffer.from(ownerMSPID));
    return true;
  }

  @Transaction()
  public async setBridge(
    ctx: Context,
    bridgeMSPID: string,
    bridgeID: string,
  ): Promise<boolean> {
    await this.checkPermission(ctx);
    await ctx.stub.putState("bridgeMSPID", Buffer.from(bridgeMSPID));
    await ctx.stub.putState("bridgeID", Buffer.from(bridgeID));
    return true;
  }

  @Transaction()
  public async getToken(ctx: Context, tokenId: string): Promise<Token> {
    const valueBytes = await ctx.stub.getState(tokenId);

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
    interactions: string,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const valueBytes = await ctx.stub.getState(tokenId);

    const bridge = await ctx.stub.getState("bridgeMSPID");

    if (valueBytes && valueBytes.length > 0) {
      throw new Error(
        `Asset with ID ${tokenId} is already wrapped ${valueBytes.toString()}`,
      );
    }

    if (!bridge || bridge.length === 0) {
      throw new Error(`Bridge is not set`);
    }

    const list = await this.createNonStandardTokenOntology(
      ctx,
      tokenId,
      interactions,
    );

    const checkPermission = await this.getOntologyMethodFromList(
      list,
      InteractionSignatureType.CHECKPERMITION,
    );

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

    try {
      if (checkPermission) {
        await this.interact(ctx, checkPermission, token);
      }
    } catch (error) {
      await ctx.stub.deleteState(tokenId); //maybe is not needed
      throw new Error(`Wrap failed: ${error}`);
    }

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

    for (const interactionType in InteractionSignatureType) {
      await ctx.stub.deleteState(tokenId + ":" + interactionType);
    }

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

    // const to = await ctx.clientIdentity.getID();

    await this.interact(
      ctx,
      await this.getOntologyMethod(ctx, tokenId, InteractionSignatureType.LOCK),
      token,
      amount,
    );

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

    await this.interact(
      ctx,
      await this.getOntologyMethod(
        ctx,
        tokenId,
        InteractionSignatureType.UNLOCK,
      ),
      token,
      amount,
    );

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

    await this.interact(
      ctx,
      await this.getOntologyMethod(ctx, tokenId, InteractionSignatureType.MINT),
      token,
      amount,
    );

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

    await this.interact(
      ctx,
      await this.getOntologyMethod(ctx, tokenId, InteractionSignatureType.BURN),
      token,
      amount,
    );

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

    //const from = await ctx.clientIdentity.getID();

    await this.interact(
      ctx,
      await this.getOntologyMethod(
        ctx,
        tokenId,
        InteractionSignatureType.ASSIGN,
      ),
      token,
      amount,
      to,
    );

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
    let owner = await ctx.stub.getState("ownerMSPID");
    let bridge = await ctx.stub.getState("bridgeMSPID");

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

  private async createNonStandardTokenOntology(
    ctx: Context,
    tokenId: string,
    interactions: string,
  ): Promise<InteractionSignature[]> {
    const interactionsJson = JSON.parse(interactions) as InteractionSignature[];
    for (const interaction of interactionsJson) {
      await ctx.stub.putState(
        tokenId + "-" + interaction.type,
        Buffer.from(JSON.stringify(interaction)),
      );
    }
    return interactionsJson;
  }

  private async getOntologyMethod(
    ctx: Context,
    tokenId: string,
    interactionType: InteractionSignatureType,
  ): Promise<InteractionSignature> {
    const valueBytes = await ctx.stub.getState(tokenId + "-" + interactionType);

    if (!valueBytes || valueBytes.length === 0) {
      throw new Error(
        `Asset method with ID ${tokenId} and ${interactionType} does not exist`,
      );
    }
    return JSON.parse(valueBytes.toString()) as InteractionSignature;
  }

  private async getOntologyMethodFromList(
    interactions: InteractionSignature[],
    interactionType: InteractionSignatureType,
  ): Promise<InteractionSignature> {
    for (const interaction of interactions) {
      if (interaction.type === interactionType) {
        return interaction;
      }
    }
    return undefined;
    //throw new Error(`Interaction type ${interactionType} not found`);
  }

  private async interact(
    ctx: Context,
    interaction: InteractionSignature,
    token: Token,
    amount?: number,
    receiver?: string,
  ): Promise<void> {
    for (let i = 0; i < interaction.functionsSignature.length; i++) {
      const response = await ctx.stub.invokeChaincode(
        token.contractName,
        await this.dynamicParams(
          ctx,
          interaction.functionsSignature[i],
          interaction.variables[i],
          token,
          amount,
          receiver,
        ),
        token.channelName,
      );

      if (response.status !== 200) {
        throw new Error(
          `Interact failed: ${response.message} ${response.payload}`,
        );
      }
    }
  }

  private async dynamicParams(
    ctx: Context,
    functionSignature: string,
    variables: VarType[],
    token: Token,
    amount?: number,
    receiver?: string,
  ): Promise<any[]> {
    const list = [];
    list.push(functionSignature);
    for (const variable of variables) {
      switch (variable) {
        case VarType.CONTRACTNAME:
          list.push(token.contractName);
          break;
        case VarType.CHANNELNAME:
          list.push(token.channelName);
          break;
        case VarType.TOKENID:
          list.push(token.tokenId);
          break;
        case VarType.OWNER:
          list.push(token.owner);
          break;
        case VarType.OWNERMSPID:
          list.push(token.mspId);
          break;
        case VarType.BRIDGE:
          list.push(await ctx.stub.getState("bridgeID"));
          break;
        case VarType.BRIDGEMSPID:
          list.push(await ctx.stub.getState("bridgeMSPID"));
          break;
        case VarType.AMOUNT:
          list.push(amount.toString());
          break;
        case VarType.BRIDGE:
          list.push(await ctx.stub.getState("bridge"));
          break;
        case VarType.RECEIVER:
          list.push(receiver);
          break;
        case VarType.MSPID:
          list.push(await ctx.clientIdentity.getMSPID());
          break;
      }
    }
    return list;
  }
}
