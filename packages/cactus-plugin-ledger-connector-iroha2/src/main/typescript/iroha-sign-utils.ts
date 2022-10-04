/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Signing utility functions for HL Iroha V2 ledger.
 */

import { Signer, makeSignedTransaction } from "@iroha2/client";
import { TransactionPayload, VersionedTransaction } from "@iroha2/data-model";

import { generateIrohaV2KeyPair } from "./cactus-iroha-sdk-wrapper/client";
import { createAccountId } from "./cactus-iroha-sdk-wrapper/data-factories";
import { Iroha2KeyPair } from "./public-api";

/**
 * Sign transaction binary received from `GenerateTransactionV1` endpoint.
 *
 * @param serializedTx serialized unsigned transaction from the connector (`Uint8Array`).
 * @param accountName signer account name.
 * @param domainName signer account domain.
 * @param keyPair public and private keys to sign with.
 *
 * @returns serialied signed transaction ready to be sent (`Uint8Array`)
 */
export function signIrohaV2Transaction(
  serializedTx: Uint8Array,
  accountName: string,
  domainName: string,
  keyPair: Iroha2KeyPair,
): Uint8Array {
  const unsignedTx = TransactionPayload.fromBuffer(serializedTx);

  const account = createAccountId(accountName, domainName);
  const irohaKeyPair = generateIrohaV2KeyPair(
    keyPair.publicKey,
    keyPair.privateKey,
  );
  const signer = new Signer(account, irohaKeyPair);
  const signedTx = makeSignedTransaction(unsignedTx, signer);

  return VersionedTransaction.toBuffer(signedTx);
}
