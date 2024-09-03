/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import { AssetReference } from "./asset-reference";

const bridgedOutAmountKey = "amountBridgedOut";

@Info({
  title: "AssetReferenceContract",
  description: "Smart contract for trading assets",
})
export class AssetReferenceContract extends Contract {
  // AssetReferenceExists returns true when asset with given ID exists in world state.
  @Transaction(false)
  @Returns("boolean")
  public async AssetReferenceExists(
    ctx: Context,
    id: string,
  ): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return !!assetJSON && assetJSON.length > 0;
  }

  // IsAssetReferenceLocked returns true when asset with given ID is locked in world state.
  @Transaction(false)
  @Returns("boolean")
  public async IsAssetReferenceLocked(
    ctx: Context,
    id: string,
  ): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);

    if (assetJSON && assetJSON.length > 0) {
      const asset = JSON.parse(assetJSON.toString());
      return asset.isLocked;
    } else {
      throw new Error(`The asset reference ${id} does not exist`);
    }
  }

  // CreateAssetReference issues a new asset to the world state with given details.
  @Transaction()
  public async CreateAssetReference(
    ctx: Context,
    assetId: string,
    numberTokens: number,
    recipient: string,
  ): Promise<void> {
    console.log(
      "Creating new asset reference with id: " +
        assetId +
        " representing " +
        numberTokens +
        " tokens",
    );
    const exists: boolean = await this.AssetReferenceExists(ctx, assetId);
    if (exists) {
      throw new Error(`The asset reference with ID ${assetId} already exists`);
    }

    const asset: AssetReference = {
      id: assetId,
      isLocked: false,
      numberTokens: numberTokens,
      recipient: recipient,
    };

    const buffer: Buffer = Buffer.from(JSON.stringify(asset));
    await ctx.stub.putState(assetId, buffer);
  }

  @Transaction()
  public async Refund(
    ctx: Context,
    numberTokens: number,
    finalFabricIdentity: string,
    ethAddress: string,
  ): Promise<void> {
    await this.CheckPermission(ctx);

    console.log(
      "Calling refund tokens to " + finalFabricIdentity + " from " + ethAddress,
    );
    await ctx.stub.invokeChaincode(
      "cbdc",
      ["Refund", finalFabricIdentity, numberTokens.toString(), ethAddress],
      ctx.stub.getChannelID(),
    );

    await this.DecreaseBridgedAmount(ctx, numberTokens);
  }

  @Transaction(false)
  @Returns("AssetReference")
  public async ReadAssetReference(
    ctx: Context,
    assetId: string,
  ): Promise<AssetReference> {
    const exists: boolean = await this.AssetReferenceExists(ctx, assetId);
    if (!exists) {
      throw new Error(`The asset reference ${assetId} does not exist`);
    }
    const data: Uint8Array = await ctx.stub.getState(assetId);
    const asset: AssetReference = JSON.parse(data.toString()) as AssetReference;
    return asset;
  }

  @Transaction()
  public async LockAssetReference(
    ctx: Context,
    assetId: string,
  ): Promise<void> {
    await this.CheckPermission(ctx);

    const exists: boolean = await this.AssetReferenceExists(ctx, assetId);
    if (!exists) {
      throw new Error(`The asset reference ${assetId} does not exist`);
    }

    if (await this.IsAssetReferenceLocked(ctx, assetId)) {
      throw new Error(`The asset reference ${assetId} is already locked`);
    }

    const asset: AssetReference = await this.ReadAssetReference(ctx, assetId);
    asset.isLocked = true;
    const buffer: Buffer = Buffer.from(JSON.stringify(asset));

    console.log("Locking asset reference with id: " + assetId);
    await ctx.stub.putState(assetId, buffer);
  }

  @Transaction(false)
  public async CheckValidBridgeOut(
    ctx: Context,
    assetId: string,
    amount: string,
    fabricID: string,
    ethAddress: string,
  ): Promise<void> {
    // check if this transfer is allowed
    const asset: AssetReference = await this.ReadAssetReference(ctx, assetId);

    if (asset.recipient != fabricID) {
      throw new Error(
        `it is not possible to transfer tokens escrowed by another user`,
      );
    }

    if (asset.numberTokens != parseInt(amount)) {
      throw new Error(
        `it is not possible to transfer a different amount of CBDC than the ones escrowed`,
      );
    }

    await ctx.stub.invokeChaincode(
      "cbdc",
      ["checkAddressMapping", fabricID, ethAddress],
      ctx.stub.getChannelID(),
    );
  }

  @Transaction(false)
  public async CheckValidBridgeBack(
    ctx: Context,
    fabricID: string,
    ethAddress: string,
  ): Promise<void> {
    await ctx.stub.invokeChaincode(
      "cbdc",
      ["checkAddressMapping", fabricID, ethAddress],
      ctx.stub.getChannelID(),
    );
  }

  @Transaction()
  public async UnlockAssetReference(
    ctx: Context,
    assetId: string,
  ): Promise<void> {
    await this.CheckPermission(ctx);

    const exists: boolean = await this.AssetReferenceExists(ctx, assetId);
    if (!exists) {
      throw new Error(`The asset reference ${assetId} does not exist`);
    }

    const asset: AssetReference = await this.ReadAssetReference(ctx, assetId);
    asset.isLocked = false;
    const buffer: Buffer = Buffer.from(JSON.stringify(asset));

    console.log("Unlocking asset reference with id: " + assetId);
    await ctx.stub.putState(assetId, buffer);
  }

  @Transaction()
  public async DeleteAssetReference(
    ctx: Context,
    assetId: string,
  ): Promise<void> {
    await this.CheckPermission(ctx);

    const exists: boolean = await this.AssetReferenceExists(ctx, assetId);
    if (!exists) {
      throw new Error(`The asset reference ${assetId} does not exist`);
    }
    const asset = await this.ReadAssetReference(ctx, assetId);
    await this.IncreaseBridgedAmount(ctx, asset.numberTokens);

    console.log("Deleting asset reference with id: " + assetId);
    await ctx.stub.deleteState(assetId);
  }

  @Transaction(false)
  public async GetBridgedOutAmount(ctx: Context): Promise<number> {
    const amountBytes = await ctx.stub.getState(bridgedOutAmountKey);

    let amountValue;
    // If value doesn't yet exist, we'll create it with a value of 0
    if (!amountBytes || amountBytes.length === 0) {
      amountValue = 0;
    } else {
      amountValue = parseInt(amountBytes.toString());
    }

    return amountValue;
  }

  @Transaction()
  public async IncreaseBridgedAmount(
    ctx: Context,
    value: number,
  ): Promise<void> {
    await this.CheckPermission(ctx);

    const newBalance = this.add(await this.GetBridgedOutAmount(ctx), value);
    await ctx.stub.putState(
      bridgedOutAmountKey,
      Buffer.from(newBalance.toString()),
    );
  }

  @Transaction()
  public async DecreaseBridgedAmount(
    ctx: Context,
    value: number,
  ): Promise<void> {
    await this.CheckPermission(ctx);

    const newBalance = this.sub(await this.GetBridgedOutAmount(ctx), value);

    if (newBalance < 0) {
      throw new Error(`Bridged back too many tokens`);
    }
    await ctx.stub.putState(
      bridgedOutAmountKey,
      Buffer.from(newBalance.toString()),
    );
  }

  // GetAllAssets returns all assets found in the world state.
  @Transaction(false)
  public async GetAllAssetReferences(ctx: Context): Promise<string> {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8",
      );
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

  @Transaction()
  public async ResetState(ctx: Context): Promise<void> {
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      console.log(result.value);
      await ctx.stub.putState(result.value.key, undefined);
      result = await iterator.next();
    }

    await ctx.stub.putState(bridgedOutAmountKey, Buffer.from("0"));
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

  private async CheckPermission(ctx: Context) {
    // this needs to be called by entity2 (the bridging entity)
    const clientMSPID = await ctx.clientIdentity.getMSPID();
    if (clientMSPID !== "Org2MSP") {
      throw new Error(
        `client is not authorized to perform the operation. ${clientMSPID} != "Org2MSP"`,
      );
    }
  }
}
