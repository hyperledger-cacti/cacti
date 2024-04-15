// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output

export abstract class SATPBridgeManager {
  public abstract lockAsset(
    sessionId: string,
    assetId: string,
  ): Promise<string>;
  public abstract unlockAsset(
    sessionId: string,
    assetId: string,
  ): Promise<string>;
  public abstract mintAsset(
    sessionId: string,
    assetId: string,
  ): Promise<string>;
  public abstract burnAsset(
    sessionId: string,
    assetId: string,
  ): Promise<string>;
}
