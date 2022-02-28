/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * verifier-factory.ts
 */

/**
 * A class that represents an event.
 * The purpose is to receive the event of Ledger on the Verifier side.
 */
export type LedgerEvent<BlockType = any> = {
  id: string;
  verifierId: string;
  data: BlockType | null;
};

/**
 * Interface required for monitoring ledger event using callback to Verifier.startMonitor()
 */
export interface IVerifierEventListener<BlockType = any> {
  onEvent(ledgerEvent: LedgerEvent<BlockType>): void;
  onError?(err: any): void;
}

/**
 * Common interface for common verifier implementation.
 */
export interface IVerifier {
  // BLP -> Verifier
  sendAsyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: Record<string, unknown>,
  ): Promise<void>;
  sendSyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: Record<string, unknown>,
  ): Promise<any>;
  startMonitor(
    id: string,
    options: Record<string, unknown>,
    eventListener: IVerifierEventListener,
  ): void;
  stopMonitor(id?: string): void;
}
