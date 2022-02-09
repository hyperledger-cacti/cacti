/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * PluginConfig.js
 */

/*
 * Summary:
 * Coordination server connection destination dependent part setting file
 * Definition value specific to the connection destination dependent part
 */

export const SplugConfig = {
  fabric: {
    mspid: "Org1MSP",
    keystore: "/etc/cactus/fabric/wallet",
    connUserName: "appUser",
    contractName: "fabcar",
    peers: [
      {
        name: "peer0.org1.example.com",
        requests: "grpcs://cartrade_faio2x_testnet:7051",
        tlsca:
          "/etc/cactus/fabric/crypto-config/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem",
      },
    ],
    orderer: {
      name: "orderer.example.com",
      url: "grpcs://cartrade_faio2x_testnet:7050",
      tlsca:
        "/etc/cactus/fabric/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
    },
    ca: {
      name: "ca-org1",
      url: "https://cartrade_faio2x_testnet:7054",
    },
    submitter: {
      name: "admin",
      secret: "adminpw",
    },
    channelName: "mychannel",
    chaincodeId: "fabcar",
  },
};