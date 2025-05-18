/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-ethereum.ts
 */

import { ConfigUtil } from "@hyperledger/cactus-common-example-server";
import {
  Web3SigningCredentialType,
  signTransaction,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "TransactionEthereum";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const mapFromAddressNonce: Map<string, number> = new Map();

import { getEthereumConnector } from "./ethereum-connector";

export async function sendEthereumTransaction(
  transaction: any,
  from: string,
  privateKey: string,
) {
  const connector = await getEthereumConnector();

  if (!("nonce" in transaction)) {
    const nonce = await getNewNonce(from);
    transaction = {
      ...transaction,
      nonce,
    };
  }
  logger.debug("sendEthereumTransaction", transaction);

  const { serializedTransactionHex, txId } = signTransaction(
    transaction,
    privateKey,
    {
      name: config.signTxInfo.ethereum.chainName,
      chainId: config.signTxInfo.ethereum.chainID,
      networkId: config.signTxInfo.ethereum.networkID,
      defaultHardfork: config.signTxInfo.ethereum.defaultHardfork,
    },
  );
  logger.info("Sending ethereum transaction with ID", txId);

  return connector.transact({
    web3SigningCredential: {
      type: Web3SigningCredentialType.None,
    },
    transactionConfig: {
      rawTransaction: serializedTransactionHex,
    },
  });
}

export async function getNewNonce(fromAddress: string): Promise<number> {
  logger.info("Get current nonce for account", fromAddress);
  const connector = await getEthereumConnector();

  const nonceBigInt = (await connector.invokeRawWeb3EthMethod({
    methodName: "getTransactionCount",
    params: [fromAddress],
  })) as bigint;
  let nonce = Number(nonceBigInt);
  const latestNonce = mapFromAddressNonce.get(fromAddress);

  if (latestNonce && nonce <= latestNonce) {
    // nonce correction
    nonce = latestNonce + 1;
    logger.debug(
      `##getNewNonce(C): Adjust txnCount, fromAddress: ${fromAddress}, nonce: ${nonce}`,
    );
  }

  logger.debug(`##getNewNonce(G): txnCountHex: ${nonce}`);
  mapFromAddressNonce.set(fromAddress, nonce);
  return nonce;
}

export async function getAccountBalance(address: string): Promise<number> {
  logger.info("Get account balance", address);
  const connector = await getEthereumConnector();

  if (!address.toLowerCase().startsWith("0x")) {
    address = "0x" + address;
    logger.debug("Added hex prefix to address:", address);
  }

  const balance = (await connector.invokeRawWeb3EthMethod({
    methodName: "getBalance",
    params: [address],
  })) as bigint;
  return Number(balance);
}
