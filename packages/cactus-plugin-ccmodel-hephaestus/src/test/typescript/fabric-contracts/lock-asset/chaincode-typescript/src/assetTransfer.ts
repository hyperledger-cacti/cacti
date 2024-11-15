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
import { Asset } from "./asset";

@Info({
  title: "AssetTransfer",
  description: "Smart contract for trading assets",
})
export class AssetTransferContract extends Contract {
  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    const assets: Asset[] = [
      {
        ID: "asset1",
        size: 5,
        isLocked: false,
        owner: "owner1",
      },
      {
        ID: "asset2",
        size: 5,
        isLocked: false,
        owner: "owner2",
      },
    ];

    for (const asset of assets) {
      asset.docType = "asset";
      await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
      console.info(`Asset ${asset.ID} initialized`);
    }
  }

  // CreateAsset issues a new asset to the world state with given details.
  @Transaction()
  public async CreateAsset(
    ctx: Context,
    id: string,
    size: number,
    owner: string,
  ): Promise<void> {
    const asset: Asset = {
      ID: id,
      size: size,
      isLocked: false,
      owner: owner,
    };
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
  }

  // ReadAsset returns the asset stored in the world state with given id.
  @Transaction(false)
  public async ReadAsset(ctx: Context, id: string): Promise<string> {
    const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return assetJSON.toString();
  }

  // UpdateAsset updates an existing asset in the world state with provided parameters.
  @Transaction()
  public async UpdateAsset(
    ctx: Context,
    id: string,
    size: number,
    owner: string,
  ): Promise<void> {
    const exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    if (this.IsAssetLocked(ctx, id)) {
      throw new Error(`The asset ${id} is locked`);
    }

    // overwriting original asset with new asset
    const assetString = await this.ReadAsset(ctx, id);
    const asset: Asset = JSON.parse(assetString);
    asset.size = size;
    asset.owner = owner;
    return ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
  }

  // TransferAsset changes the owner of an asset with given ID in the world state.
  @Transaction()
  public async TransferAsset(
    ctx: Context,
    id: string,
    newOwner: string,
  ): Promise<void> {
    const assetString = await this.ReadAsset(ctx, id);
    const asset: Asset = JSON.parse(assetString);
    asset.owner = newOwner;
    return ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
  }

  // DeleteAsset deletes a given asset from the world state.
  @Transaction()
  public async DeleteAsset(ctx: Context, id: string): Promise<void> {
    const exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    return ctx.stub.deleteState(id);
  }

  // AssetExists returns true when asset with given ID exists in world state.
  @Transaction(false)
  @Returns("boolean")
  public async AssetExists(ctx: Context, id: string): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  // IsAssetLocked returns true when asset with given ID is locked in world state.
  @Transaction(false)
  @Returns("boolean")
  public async IsAssetLocked(ctx: Context, id: string): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);

    if (assetJSON && assetJSON.length > 0) {
      const asset = JSON.parse(assetJSON.toString());
      return asset.isLocked;
    } else {
      throw new Error(`The asset ${id} does not exist`);
    }
  }

  @Transaction(false)
  @Returns("boolean")
  public async LockAsset(ctx: Context, id: string): Promise<boolean> {
    const exists = await this.AssetExists(ctx, id);

    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    // if (this.IsAssetLocked(ctx, id)) {
    //   throw new Error(`The asset ${id} is already locked`);
    // }

    const assetString = await this.ReadAsset(ctx, id);
    const asset: Asset = JSON.parse(assetString);
    asset.isLocked = true;
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    return true;
  }

  @Transaction(false)
  @Returns("boolean")
  public async UnlockAsset(ctx: Context, id: string): Promise<boolean> {
    const exists = await this.AssetExists(ctx, id);

    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    const assetString = await this.ReadAsset(ctx, id);
    const asset: Asset = JSON.parse(assetString);
    asset.isLocked = false;
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    return true;
  }

  // GetAllAssets returns all assets found in the world state.
  @Transaction(false)
  @Returns("string")
  public async GetAllAssets(ctx: Context): Promise<string> {
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
      allResults.push({ Key: result.value.key, Record: record });
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }
}
