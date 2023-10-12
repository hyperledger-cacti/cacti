/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionSigner.ts
 */

import path from "path";
import ethJsCommon from "ethereumjs-common";
import { Transaction as EthTransaction } from "ethereumjs-tx";
import { getLogger } from "log4js";
import { ConfigUtil } from "../routing-interface/util/ConfigUtil";
import { ValidatorRegistry } from "../verifier/validator-registry";

const config: any = ConfigUtil.getConfig();
const configVerifier: ValidatorRegistry = new ValidatorRegistry(
  path.resolve(__dirname, "/etc/cactus/validator-registry-config.yaml"),
);

const moduleName = "TransactionEthereum";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class TransactionSigner {
  static signTxEthereum(rawTx: object, signPkey: string) {
    logger.debug(`####in signTxEthereum()`);

    if (!configVerifier.signTxInfo) {
      throw new Error("Missing configVerifier.signTxInfo");
    }

    // ethereumjs-tx2.1.2_support
    const customCommon = ethJsCommon.forCustomChain(
      configVerifier.signTxInfo.ethereum.network,
      {
        name: configVerifier.signTxInfo.ethereum.chainName,
        networkId: parseInt(configVerifier.signTxInfo.ethereum.networkID, 10),
        chainId: parseInt(configVerifier.signTxInfo.ethereum.chainID, 10),
      },
      configVerifier.signTxInfo.ethereum.hardfork,
    );

    const privKey: Buffer = Buffer.from(signPkey, "hex");
    const tx = new EthTransaction(rawTx, { common: customCommon });
    tx.sign(privKey);

    // Get Transaction ID
    const hash: Buffer = tx.hash(true);
    const txId: string = "0x" + hash.toString("hex");
    logger.debug("##txId=" + txId);

    const serializedTx: Buffer = tx.serialize();
    const serializedTxHex: string = "0x" + serializedTx.toString("hex");
    logger.debug("##serializedTxHex=" + serializedTxHex);

    const signedTx = {
      serializedTx: serializedTxHex,
      txId: txId,
    };

    return signedTx;
  }
}
