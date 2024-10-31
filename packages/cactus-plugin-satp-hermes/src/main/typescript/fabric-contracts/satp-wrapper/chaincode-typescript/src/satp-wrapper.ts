// SPDX-License-Identifier: Apache-2.0

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

/**
 * @title SATPContractWrapper
 *
 * This contract represents the SATP Wrapper contract.
 * It provides functionalities to interact with the SATP protocol within the Cactus framework.
 * This contract provides a semantic layer to facilitate interactions with other contracts.
 *
 * @notice Ensure that the contract is initialized before using it.
 */
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

  /**
   * @notice Initialize the contract with the owner MSPID.
   * @param ctx The transaction context.
   * @param ownerMSPID The owner MSPID.
   * @returns boolean
   */
  @Transaction()
  public async Initialize(ctx: Context, ownerMSPID: string): Promise<boolean> {
    await ctx.stub.putState("ownerMSPID", Buffer.from(ownerMSPID));
    return true;
  }

  /**
   * @notice Set the bridge MSPID and bridge ID.
   * So that the bridge can interact with the contract.
   * @param ctx The transaction context.
   * @param bridgeMSPID The bridge MSPID.
   * @param bridgeID The bridge ID.
   * @returns boolean
   */
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

  /**
   * @notice Get the token information.
   * @param ctx The transaction context.
   * @param tokenId The token ID.
   * @returns Token
   */
  @Transaction()
  public async getToken(ctx: Context, tokenId: string): Promise<Token> {
    const valueBytes = await ctx.stub.getState(tokenId);

    if (!valueBytes || valueBytes.length === 0) {
      throw new Error(`Asset with ID ${tokenId} does not exist`);
    }

    return JSON.parse(valueBytes.toString()) as Token;
  }

  /**
   * @notice Wrap the asset.
   * Wraps a token with the given parameters.
   * Given interactions will call a method that creates the ontology of the token so the other methods (eg. lock, unlock, mint, burn, assign) can interact with the token.
   * This interactions should be given by the bridge and be througly tested and checked before being used, as they can be used to call any function in the token contract.
   * @param ctx The transaction context.
   * @param tokenType The token type.
   * @param tokenId The token ID.
   * @param owner The owner.
   * @param mspId The MSP ID.
   * @param channelName The channel name.
   * @param contractName The contract name.
   * @param interactions The interactions.
   * @returns boolean
   */
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

    // TODO if the tokens are standard (eg. ERC20, ERC721...) use the standard interactions
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

    // Save the token to the world state
    await ctx.stub.putState(tokenId, Buffer.from(JSON.stringify(token)));

    try {
      // If the checkPermission interaction is given, checks if the caller of the wrap has permission to interact with the token
      if (checkPermission) {
        await this.interact(ctx, checkPermission, token);
      }
    } catch (error) {
      await ctx.stub.deleteState(tokenId); //maybe is not needed
      throw new Error(`Wrap failed: ${error}`);
    }

    return true;
  }

  /**
   * @notice Unwrap the asset.
   * Unwraps a token with the given token ID. This method deletes the token from the the world state.
   * @param ctx The transaction context.
   * @param tokenId The token ID.
   * @returns boolean
   */
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

  /**
   * @notice Get the locked amount.
   * Gets the locked amount of a token with the given token ID.
   * @param ctx The transaction context.
   * @param tokenId The token ID.
   * @returns number
   */
  @Transaction()
  @Returns("number")
  public async lockedAmount(ctx: Context, tokenId: string): Promise<number> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

    return token.amount;
  }

  /**
   * @notice Lock the asset.
   * Locks a token with the given token ID and amount.
   * This method calls the lock function of the token contract.
   * @param ctx The transaction context.
   * @param tokenId The token ID.
   * @param amount The amount.
   * @returns boolean
   */
  @Transaction()
  @Returns("boolean")
  public async lock(
    ctx: Context,
    tokenId: string,
    amount: number,
  ): Promise<boolean> {
    await this.checkPermission(ctx);

    const token = await this.getToken(ctx, tokenId);

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

  /**
   * @notice Unlock the asset.
   * Unlocks a given amount of tokens with the given token ID. This method calls the unlock function of the token contract.
   * @param ctx The transaction context.
   * @param tokenId The unique identifier of the token.
   * @param amount The amount of tokens to be unlocked.
   * @returns boolean
   */
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

  /**
   * @notice Mint the asset.
   * Mints a given amount of tokens with the given token ID. This method calls the mint function of the token contract.
   * @param ctx The transaction context.
   * @param tokenId The unique identifier of the token.
   * @param amount The amount of tokens to be minted.
   */
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

  /**
   * @notice Burn the asset.
   * Burns a given amount of tokens with the given token ID. This method calls the burn function of the token contract.
   * @param ctx The transaction context.
   * @param tokenId The unique identifier of the token.
   * @param amount The amount of tokens to be burned.
   * @returns boolean
   */
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

  /**
   * @notice Assign the asset.
   * Assigns a given amount of tokens with the given token ID to a given receiver. This method calls the assign function of the token contract.
   * @param ctx The transaction context.
   * @param tokenId The unique identifier of the token.
   * @param to The receiver of the tokens.
   * @param amount The amount of tokens to be assigned.
   * @returns boolean
   */
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

  /**
   * @notice Get the token information.
   * @param ctx The transaction context.
   * @param tokenId The token ID.
   * @returns Token in JSON format
   */
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

  /**
   * @notice Check if the caller has permission to perform the operation.
   * @param ctx The transaction context.
   */
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

  /**
   * @notice Create the ontology of the token.
   * Creates the ontology of the token with the given interactions.
   * @param ctx The transaction context.
   * @param tokenId The token ID.
   * @param interactions The interactions.
   * @returns Interaction
   * @throws Error
   * @private
   */
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

  /**
   * @notice Get the ontology of the token.
   * Gets the ontology of the token with the given token ID.
   * @param ctx The transaction context.
   * @param tokenId The token ID.
   * @param interactionType The interaction type.
   * @returns Interaction
   * @throws Error
   * @private
   * @returns InteractionSignature
   * @private
   */
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

  /**
   * @notice Get the ontology of the token from a list of interactions.
   * @param interactions The interactions list.
   * @param interactionType The interaction type.
   */
  private async getOntologyMethodFromList(
    interactions: InteractionSignature[],
    interactionType: InteractionSignatureType,
  ): Promise<InteractionSignature> {
    for (const interaction of interactions) {
      if (interaction.type === interactionType) {
        return interaction;
      }
    }
  }

  /**
   * @notice Interacts with the token contract.
   * This function allows modular interactions by dynamically calling contract functions based on the stored interactions. 
   * To mitigate the risk of attacks, this method only allows the usage of known variables and only variables that are assigned to the specific token.
   * @param ctx The transaction context.
   * @param interaction The interaction.
   * @param token The token.
   * @param amount The amount.
   * @param receiver The receiver.
   */
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

  /**
   * @notice Get the dynamic parameters.
   * Encodes the parameters for the contract-to-contract calls.
   * This functions replaces the enum variables with the actual values from the Token struct.
   * @param ctx The transaction context.
   * @param functionSignature The function signature.
   * @param variables The variables to be encoded.
   * @param token The token.
   * @param amount The amount of tokens to be encoded.
   * @param receiver The the receiver account.
   * @returns The list of variables.
   */
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
