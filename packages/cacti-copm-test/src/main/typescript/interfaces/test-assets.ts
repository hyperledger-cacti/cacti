export interface TestAssets {
  addToken(assetType: string, assetQuantity: number): Promise<void>;

  addNonFungibleAsset(assetType: string, assetId: string): Promise<void>;

  tokenBalance(tokenType: string): Promise<number>;

  userOwnsNonFungibleAsset(
    assetType: string,
    assetId: string,
  ): Promise<boolean>;
}
