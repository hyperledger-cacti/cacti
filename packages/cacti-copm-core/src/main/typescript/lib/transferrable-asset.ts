import { TransferrableAssetV1PB } from "../generated/models/transferrable_asset_v1_pb_pb";
export class TransferrableAsset {
  private asset: TransferrableAssetV1PB;
  public assetType: string;

  constructor(asset: TransferrableAssetV1PB) {
    this.asset = asset;
    this.assetType = asset.assetType || "";
  }

  public isNFT(): boolean {
    if (this.asset.assetId) {
      return true;
    } else {
      return false;
    }
  }

  public idOrQuantity(): string {
    if (this.asset.assetQuantity) {
      return this.asset.assetQuantity.toString();
    } else {
      return this.asset.assetId || "";
    }
  }

  public quantity(): number {
    return this.asset.assetQuantity || 0;
  }
}
