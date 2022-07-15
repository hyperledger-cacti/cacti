/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Signing utility functions for HL Iroha ledger.
 */

import txHelper from "iroha-helpers-ts/lib/txHelper";
import { Transaction } from "iroha-helpers-ts/lib/proto/transaction_pb";

/**
 * Sign transaction binary received from `generateTransactionV1()` call.
 * Can be signed by multiple Signatories (with multiple keys) or a single key.
 *
 * @param serializedTx Serialized transaction data.
 * To convert binary response from connector into `Uint8Array` required by this function you can use:
 * ```
 * const serializedTx = Uint8Array.from(Object.values(genTxResponse.data));
 * ```
 * @param privateKeys One or multiple keys to sign the transaction with.
 * @returns Signed transaction data (`Uint8Array`)
 */
export function signIrohaTransaction(
  serializedTx: Uint8Array,
  privateKeys: string | string[],
): Uint8Array {
  const unsignedTx = Transaction.deserializeBinary(serializedTx);

  if (typeof privateKeys === "string") {
    privateKeys = [privateKeys];
  }

  const signedTx = privateKeys.reduce(
    (tx, key) => txHelper.sign(tx, key),
    unsignedTx,
  );

  return signedTx.serializeBinary();
}
