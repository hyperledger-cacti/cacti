// this file contains a class that encapsulates the logic for managing the SATP bridge (lock, unlock, etc).
// should inject satp gateway session data (having parameters/chains for transactions), and processes smart contract output

import { SATPLedgerConnector } from "../../../types/blockchain-interaction";

export abstract class SATPBridgeManager {
  // Instantiate connectors based on supported implementations, at bridge level
  private connectors: SATPLedgerConnector[] = [];

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
