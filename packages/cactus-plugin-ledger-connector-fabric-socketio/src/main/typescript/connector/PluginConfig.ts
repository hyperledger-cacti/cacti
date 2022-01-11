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
    keystore: "./wallet",
    connUserName: "user1",
    contractName: "fabcar",
    peers: [
      {
        name: "peer0.org1.example.com",
        requests: "grpcs://localhost:7051",
        // WARNING - REMEMBER TO UPADATE THE PATH
        tlsca:
          "../../../examples/discounted-cartrade/crypto-config/tlsca.org1.example.com-cert.pem",
      },
    ],
    orderer: {
      name: "orderer.example.com",
      url: "grpcs://localhost:7050",
      // WARNING - REMEMBER TO UPADATE THE PATH
      tlsca:
        "../../../examples/discounted-cartrade/crypto-config/tlsca.example.com-cert.pem",
    },
    ca: {
      name: "ca-org1",
      url: "https://localhost:7054",
    },
    submitter: {
      name: "admin",
      secret: "adminpw",
    },
    channelName: "mychannel",
    chaincodeId: "fabcar",
  },
};