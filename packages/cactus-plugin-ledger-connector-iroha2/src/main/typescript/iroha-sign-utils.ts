/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Signing utility functions for HL Iroha V2 ledger.
 * Remember to free key objects supplied to the signing methods.
 */

import {
  Signer,
  makeVersionedSignedTransaction,
  makeVersionedSignedQuery,
} from "@iroha2/client";
import {
  QueryPayload,
  TransactionPayload,
  VersionedSignedQueryRequest,
  VersionedSignedTransaction,
} from "@iroha2/data-model";

import { generateIrohaV2KeyPair } from "./cactus-iroha-sdk-wrapper/client";
import { createAccountId } from "./cactus-iroha-sdk-wrapper/data-factories";
import { Iroha2KeyPair } from "./public-api";

/**
 * Create IrohaV2 SDK Signer object.
 *
 * @param accountName signer account name.
 * @param domainName signer account domain.
 * @param keyPair public and private keys to sign with.
 *
 * @returns Signer for supplied credentials.
 */
function getSigner(
  accountName: string,
  domainName: string,
  keyPair: Iroha2KeyPair,
): Signer {
  const account = createAccountId(accountName, domainName);
  const irohaKeyPair = generateIrohaV2KeyPair(
    keyPair.publicKey,
    keyPair.privateKey,
  );

  return new Signer(account, irohaKeyPair);
}

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
  const signer = getSigner(accountName, domainName, keyPair);
  const signedTx = makeVersionedSignedTransaction(unsignedTx, signer);
  return VersionedSignedTransaction.toBuffer(signedTx);
}

/**
 * Sign query payload received from `GenerateTransactionV1` endpoint.
 *
 * @param serializedQuery serialized unsigned query from the connector (`Uint8Array`).
 * @param accountName signer account name.
 * @param domainName signer account domain.
 * @param keyPair public and private keys to sign with.
 *
 * @returns serialied signed transaction ready to be sent (`Uint8Array`)
 */
export function signIrohaV2Query(
  serializedQuery: Uint8Array,
  accountName: string,
  domainName: string,
  keyPair: Iroha2KeyPair,
): Uint8Array {
  const unsignedQueryReq = QueryPayload.fromBuffer(serializedQuery);
  const signer = getSigner(accountName, domainName, keyPair);
  const queryReq = makeVersionedSignedQuery(unsignedQueryReq, signer);
  return VersionedSignedQueryRequest.toBuffer(queryReq);
}
