/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * validator-registry.ts
 */

const fs = require("fs");
const yaml = require("js-yaml");

class RequestedData {
  dataName: string;
  dataType: string;
}

class ApiInfo {
  apiType: string;
  requestedData: Array<RequestedData>;
}

export class LedgerPluginInfo {
  validatorID: string;
  validatorType: string;
  validatorURL: string;
  validatorKeyPath: string;
  ledgerInfo: {
    ledgerAbstract: string;
  };
  apiInfo: Array<ApiInfo>;
}

class Peer {
  name: string;
  requests: string;
}

class SignTxInfo {
  ethereum: {
    chainName: string;
    networkID: string;
    chainID: string;
    network: string;
    hardfork: string;
  };
  fabric: {
    mspID: string;
    peers: Array<Peer>;
    orderer: {
      URL: string;
    };
    ca: {
      name: string;
      URL: string;
    };
    submitter: {
      name: string;
      secret: string;
    };
    channelName: string;
    chaincodeID: string;
  };
}

export class ValidatorRegistry {
  ledgerPluginInfo: Array<LedgerPluginInfo>;
  signTxInfo: SignTxInfo;

  constructor(path: string) {
    const yamlText = fs.readFileSync(path, "utf8");
    const yamlObj = yaml.safeLoad(yamlText);
    this.ledgerPluginInfo = yamlObj.ledgerPluginInfo;
    this.signTxInfo = yamlObj.signTxInfo;
  }
}
