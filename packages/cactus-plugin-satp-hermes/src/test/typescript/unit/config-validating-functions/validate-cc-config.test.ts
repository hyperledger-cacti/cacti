import "jest-extended";
import { validateCCConfig } from "../../../../main/typescript/services/validation/config-validating-functions/validate-cc-config";
import { INetworkOptions } from "../../../../main/typescript/cross-chain-mechanisms/bridge/bridge-types";
import { IFabricLeafNeworkOptions } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/fabric-leaf";
import { IBesuLeafNeworkOptions } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/besu-leaf";
import { IEthereumLeafNeworkOptions } from "../../../../main/typescript/cross-chain-mechanisms/bridge/leafs/ethereum-leaf";
import {
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
  FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
} from "@hyperledger/cactus-test-tooling";

const connectionProfile = {
  name: "test-network-org1",
  version: "1.0.0",
  organizations: {
    Org1MSP: {
      mspid: "Org1MSP",
      peers: ["peer0.org1.example.com", "peer1.org1.example.com"],
      certificateAuthorities: ["ca.org1.example.com"],
    },
  },
  peers: {
    "peer0.org1.example.com": {
      url: "grpcs://localhost:7051",
      grpcOptions: {
        "ssl-target-name-override": "peer0.org1.example.com",
      },
      tlsCACerts: {
        pem: "-----BEGIN CERTIFICATE-----\n...peer0-cert...\n-----END CERTIFICATE-----",
      },
    },
    "peer1.org1.example.com": {
      url: "grpcs://localhost:8051",
      grpcOptions: {
        "ssl-target-name-override": "peer1.org1.example.com",
      },
      tlsCACerts: {
        pem: "-----BEGIN CERTIFICATE-----\n...peer1-cert...\n-----END CERTIFICATE-----",
      },
    },
  },
  certificateAuthorities: {
    "ca.org1.example.com": {
      url: "https://localhost:7054",
      caName: "ca-org1",
      tlsCACerts: {
        pem: "-----BEGIN CERTIFICATE-----\n...ca-cert...\n-----END CERTIFICATE-----",
      },
      httpOptions: {
        verify: false,
      },
    },
  },
  orderers: {
    "orderer.example.com": {
      url: "grpcs://localhost:7050",
      grpcOptions: {
        "ssl-target-name-override": "orderer.example.com",
      },
      tlsCACerts: {
        pem: "-----BEGIN CERTIFICATE-----\n...orderer-cert...\n-----END CERTIFICATE-----",
      },
    },
  },
  channels: {
    mychannel: {
      orderers: ["orderer.example.com"],
      peers: {
        "peer0.org1.example.com": {
          endorsingPeer: true,
          chaincodeQuery: true,
          ledgerQuery: true,
          eventSource: true,
          discover: true,
        },
      },
    },
  },
};

const fabricConfig = {
  networkIdentification: {
    id: "FabricLedgerTestNetwork",
    ledgerType: "FABRIC_2",
  },
  userIdentity: {
    credentials: {
      certificate:
        "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
      privateKey:
        "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    },
    mspId: "Org2MSP", // Membership Service Provider ID
    type: "X.509", // Credential type; typically X.509 for Fabric
  },
  connectorOptions: {
    dockerBinary: "/usr/local/bin/docker",
    peerBinary: "/fabric-samples/bin/peer",
    goBinary: "/usr/local/go/bin/go",
    cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
    sshConfig: {
      // SSH access details (if interacting over SSH)
      host: "172.20.0.6",
      privateKey:
        "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n",
      username: "root",
      port: 22,
    },
    connectionProfile: connectionProfile,
    discoveryOptions: {
      enabled: true,
      asLocalhost: true,
    },
    eventHandlerOptions: {
      strategy: "NETWORK_SCOPE_ALLFORTX",
      commitTimeout: 300,
    },
  },
  channelName: "mychannel",
  targetOrganizations: [
    FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
    FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
  ],
  caFile: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.ORDERER_TLS_ROOTCERT_FILE,
  ccSequence: 1,
  orderer: "orderer.example.com:7050",
  ordererTLSHostnameOverride: "orderer.example.com",
  connTimeout: 60,
  signaturePolicy: "config.signaturePolicy",
  mspId: "Org2MSP",
  wrapperContractName: "exampleWrapperContractName",
  leafId: "exampleLeafId",
  keyPair: {
    publicKey:
      "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
    privateKey:
      "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
  },
  claimFormats: [2],
} as Partial<IFabricLeafNeworkOptions> & INetworkOptions;

const ethereumConfig = {
  networkIdentification: {
    id: "EthereumLedgerTestNetwork",
    ledgerType: "ETHEREUM",
  },
  signingCredential: {
    ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
    secret: "test",
    type: "GETH_KEYCHAIN_PASSWORD",
  },
  connectorOptions: {
    rpcApiHttpHost: "http://172.23.0.4:8545",
    rpcApiWsHost: "ws://172.23.0.4:8546",
  },
  leafId: "exampleLeafId",
  keyPair: {
    publicKey:
      "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
    privateKey:
      "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
  },
  claimFormats: [2],
  wrapperContractAddress: "0x8230f81920ed354445d201222470ad6f92459D3f",
  wrapperContractName: "exampleWrapperContractName",
  gasConfig: {
    gas: "6721975",
    gasPrice: "20000000000",
  },
} as Partial<IEthereumLeafNeworkOptions> & INetworkOptions;

const besuConfig = {
  networkIdentification: {
    id: "BesuLedgerTestNetwork",
    ledgerType: "BESU_2X",
  },
  signingCredential: {
    ethAccount: "0x736dC9B8258Ec5ab2419DDdffA9e1fa5C201D0b4",
    secret:
      "0xc31e76f70d6416337d3a7b7a8711a43e30a14963b5ba622fa6c9dbb5b4555986",
    type: "PRIVATE_KEY_HEX",
  },
  connectorOptions: {
    rpcApiHttpHost: "http://172.20.0.6:8545",
    rpcApiWsHost: "ws://172.20.0.6:8546",
  },
  leafId: "exampleLeafId",
  keyPair: {
    publicKey:
      "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
    privateKey:
      "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
  },
  claimFormats: [1],
  wrapperContractAddress: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B",
  wrapperContractName: "exampleWrapperContractName",
  gas: 999999999999999,
} as Partial<IBesuLeafNeworkOptions> & INetworkOptions;

describe("Validate CC Config", () => {
  it("should pass with a valid cc config (oracleConfig)", async () => {
    const oracleConfig = [
      {
        networkIdentification: {
          id: "EthereumLedgerTestNetwork",
          ledgerType: "ETHEREUM",
        },
        signingCredential: {
          ethAccount: "0x4879B0F1532075A4C28Dab8FA561Aa7e9FE827d7",
          secret:
            "0x67d8ee51db366f84b3c479e105b7f5ef5f358332d027980880168c92764b6a5a",
          type: "GETH_KEYCHAIN_PASSWORD",
        },
        gasConfig: {
          gas: "6721975",
          gasPrice: "20000000000",
        },
        connectorOptions: {
          rpcApiHttpHost: "http://127.0.0.1:7545",
          rpcApiWsHost: "ws://127.0.0.1:7545",
        },
        claimFormats: [2],
      },
    ];
    const result = validateCCConfig({
      configValue: {
        oracleConfig,
      },
    });
    expect(result.oracleConfig).toEqual(oracleConfig);
  });

  it("should pass with a valid cc config (FabricConfig)", async () => {
    const bridgeConfig = [fabricConfig];
    const result = validateCCConfig({
      configValue: {
        bridgeConfig,
      },
    });
    expect(result.bridgeConfig![0].networkIdentification.ledgerType).toEqual(
      "FABRIC_2",
    );
  });

  it("should pass with a valid cc config  (EthereumConfig)", async () => {
    const bridgeConfig = [ethereumConfig];
    const result = validateCCConfig({
      configValue: {
        bridgeConfig,
      },
    });
    expect(result.bridgeConfig![0].networkIdentification.ledgerType).toEqual(
      "ETHEREUM",
    );
  });

  it("should pass with a valid cc config (BesuConfig)", async () => {
    const bridgeConfig = [besuConfig];
    const result = validateCCConfig({
      configValue: {
        bridgeConfig,
      },
    });
    expect(result.bridgeConfig![0].networkIdentification.ledgerType).toEqual(
      "BESU_2X",
    );
  });

  it("should throw when instantiate SATP Gateway Runner without bridgesConfig nor oracleConfig", async () => {
    expect(() =>
      validateCCConfig({
        configValue: {
          notConfig: [
            {
              networkIdentification: {
                id: "EthereumLedgerTestNetwork",
                ledgerType: "ETHEREUM",
              },
              signingCredential: {
                ethAccount: "0x4879B0F1532075A4C28Dab8FA561Aa7e9FE827d7",
                secret:
                  "0x67d8ee51db366f84b3c479e105b7f5ef5f358332d027980880168c92764b6a5a",
                type: "GETH_KEYCHAIN_PASSWORD",
              },
              gasConfig: {
                gas: "6721975",
                gasPrice: "20000000000",
              },
              connectorOptions: {
                rpcApiHttpHost: "http://127.0.0.1:7545",
                rpcApiWsHost: "ws://127.0.0.1:7545",
              },
              claimFormats: [2],
            },
          ],
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when instantiate SATP Gateway Runner with a null oracleConfig", async () => {
    expect(() =>
      validateCCConfig({
        configValue: {
          oracleConfig: null,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when bridgeConfig is not a array", async () => {
    const bridgeConfig = ethereumConfig;
    expect(() =>
      validateCCConfig({
        configValue: {
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when bridgeConfig is not a array and is a valid oracleConfig", async () => {
    const bridgeConfig = besuConfig;
    const oracleConfig = [
      {
        networkIdentification: {
          id: "EthereumLedgerTestNetwork",
          ledgerType: "ETHEREUM",
        },
        signingCredential: {
          ethAccount: "0x4879B0F1532075A4C28Dab8FA561Aa7e9FE827d7",
          secret:
            "0x67d8ee51db366f84b3c479e105b7f5ef5f358332d027980880168c92764b6a5a",
          type: "GETH_KEYCHAIN_PASSWORD",
        },
        gasConfig: {
          gas: "6721975",
          gasPrice: "20000000000",
        },
        connectorOptions: {
          rpcApiHttpHost: "http://127.0.0.1:7545",
          rpcApiWsHost: "ws://127.0.0.1:7545",
        },
        claimFormats: [2],
      },
    ];
    expect(() =>
      validateCCConfig({
        configValue: {
          oracleConfig,
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig && config\.oracleConfig/);
  });

  it("should throw when is an invalid FabricConfig (the connTimeout should be a number)", async () => {
    const badFabricConfig = {
      networkIdentification: {
        id: "FabricLedgerTestNetwork",
        ledgerType: "FABRIC_2",
      },
      userIdentity: {
        credentials: {
          certificate:
            "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
          privateKey:
            "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
        },
        mspId: "Org2MSP", // Membership Service Provider ID
        type: "X.509", // Credential type; typically X.509 for Fabric
      },
      connectorOptions: {
        dockerBinary: "/usr/local/bin/docker",
        peerBinary: "/fabric-samples/bin/peer",
        goBinary: "/usr/local/go/bin/go",
        cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        sshConfig: {
          // SSH access details (if interacting over SSH)
          host: "172.20.0.6",
          privateKey:
            "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n",
          username: "root",
          port: 22,
        },
        connectionProfile: connectionProfile,
        discoveryOptions: {
          enabled: true,
          asLocalhost: true,
        },
        eventHandlerOptions: {
          strategy: "NETWORK_SCOPE_ALLFORTX",
          commitTimeout: 300,
        },
      },
      channelName: "mychannel",
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.ORDERER_TLS_ROOTCERT_FILE,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: "60", //should be a number
      signaturePolicy: "config.signaturePolicy",
      mspId: "Org2MSP",
      wrapperContractName: "exampleWrapperContractName",
      leafId: "exampleLeafId",
      keyPair: {
        publicKey:
          "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
        privateKey:
          "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
      },
      claimFormats: [2],
    };
    const bridgeConfig = [badFabricConfig];
    expect(() =>
      validateCCConfig({
        configValue: {
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when is an invalid FabricOptionsJSON (the connectorOptions->peerBinary should be a string)", async () => {
    const badFabricConfig = {
      networkIdentification: {
        id: "FabricLedgerTestNetwork",
        ledgerType: "FABRIC_2",
      },
      userIdentity: {
        credentials: {
          certificate:
            "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
          privateKey:
            "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
        },
        mspId: "Org2MSP", // Membership Service Provider ID
        type: "X.509", // Credential type; typically X.509 for Fabric
      },
      connectorOptions: {
        dockerBinary: "/usr/local/bin/docker",
        peerBinary: 123, //should be a string
        goBinary: "/usr/local/go/bin/go",
        cliContainerEnv: FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        sshConfig: {
          // SSH access details (if interacting over SSH)
          host: "172.20.0.6",
          privateKey:
            "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n",
          username: "root",
          port: 22,
        },
        connectionProfile: connectionProfile,
        discoveryOptions: {
          enabled: true,
          asLocalhost: true,
        },
        eventHandlerOptions: {
          strategy: "NETWORK_SCOPE_ALLFORTX",
          commitTimeout: 300,
        },
      },
      channelName: "mychannel",
      targetOrganizations: [
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_1,
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2,
      ],
      caFile:
        FABRIC_25_LTS_FABRIC_SAMPLES_ENV_INFO_ORG_2.ORDERER_TLS_ROOTCERT_FILE,
      ccSequence: 1,
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      signaturePolicy: "config.signaturePolicy",
      mspId: "Org2MSP",
      wrapperContractName: "exampleWrapperContractName",
      leafId: "exampleLeafId",
      keyPair: {
        publicKey:
          "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
        privateKey:
          "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
      },
      claimFormats: [2],
    };
    const bridgeConfig = [badFabricConfig];
    expect(() =>
      validateCCConfig({
        configValue: {
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when is an invalid EthereumConfig (the wrapperContractName should be a string)", async () => {
    const badEthereumConfig = {
      networkIdentification: {
        id: "EthereumLedgerTestNetwork",
        ledgerType: "ETHEREUM",
      },
      signingCredential: {
        ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
        secret: "test",
        type: "GETH_KEYCHAIN_PASSWORD",
      },
      connectorOptions: {
        rpcApiHttpHost: "http://172.23.0.4:8545",
        rpcApiWsHost: "ws://172.23.0.4:8546",
      },
      leafId: "exampleLeafId",
      keyPair: {
        publicKey:
          "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
        privateKey:
          "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
      },
      claimFormats: [2],
      wrapperContractAddress: "0x8230f81920ed354445d201222470ad6f92459D3f",
      wrapperContractName: 123, //should be a string
      gasConfig: {
        gas: "6721975",
        gasPrice: "20000000000",
      },
    };
    const bridgeConfig = [badEthereumConfig];
    expect(() =>
      validateCCConfig({
        configValue: {
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when is an invalid EthereumOptionsJSON (the connectorOptions->rpcApiWsHost should be a string)", async () => {
    const badEthereumConfig = {
      networkIdentification: {
        id: "EthereumLedgerTestNetwork",
        ledgerType: "ETHEREUM",
      },
      signingCredential: {
        ethAccount: "0x8230f81920ed354445d201222470ad6f92459D3f",
        secret: "test",
        type: "GETH_KEYCHAIN_PASSWORD",
      },
      connectorOptions: {
        rpcApiHttpHost: "http://172.23.0.4:8545",
        rpcApiWsHost: 8546, //should be a string
      },
      leafId: "exampleLeafId",
      keyPair: {
        publicKey:
          "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
        privateKey:
          "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
      },
      claimFormats: [2],
      wrapperContractAddress: "0x8230f81920ed354445d201222470ad6f92459D3f",
      wrapperContractName: "exampleWrapperContractName",
      gasConfig: {
        gas: "6721975",
        gasPrice: "20000000000",
      },
    };
    const bridgeConfig = [badEthereumConfig];
    expect(() =>
      validateCCConfig({
        configValue: {
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when is an invalid BesuConfig (the wrapperContractName should be a string)", async () => {
    const badBesuConfig = {
      networkIdentification: {
        id: "BesuLedgerTestNetwork",
        ledgerType: "BESU_2X",
      },
      signingCredential: {
        ethAccount: "0x736dC9B8258Ec5ab2419DDdffA9e1fa5C201D0b4",
        secret:
          "0xc31e76f70d6416337d3a7b7a8711a43e30a14963b5ba622fa6c9dbb5b4555986",
        type: "PRIVATE_KEY_HEX",
      },
      connectorOptions: {
        rpcApiHttpHost: "http://172.20.0.6:8545",
        rpcApiWsHost: "ws://172.20.0.6:8546",
      },
      leafId: "exampleLeafId",
      keyPair: {
        publicKey:
          "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
        privateKey:
          "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
      },
      claimFormats: [1],
      wrapperContractAddress: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B",
      wrapperContractName: true, //should be a string
      gas: 999999999999999,
    };
    const bridgeConfig = [badBesuConfig];
    expect(() =>
      validateCCConfig({
        configValue: {
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });

  it("should throw when is an invalid BesuOptionsJSON (the connectorOptions->rpcApiHttpHost should be a string)", async () => {
    const badBesuConfig = {
      networkIdentification: {
        id: "BesuLedgerTestNetwork",
        ledgerType: "BESU_2X",
      },
      signingCredential: {
        ethAccount: "0x736dC9B8258Ec5ab2419DDdffA9e1fa5C201D0b4",
        secret:
          "0xc31e76f70d6416337d3a7b7a8711a43e30a14963b5ba622fa6c9dbb5b4555986",
        type: "PRIVATE_KEY_HEX",
      },
      connectorOptions: {
        rpcApiHttpHost: 8545, //should be a string
        rpcApiWsHost: "ws://172.20.0.6:8546",
      },
      leafId: "exampleLeafId",
      keyPair: {
        publicKey:
          "0x03a34e1d66b78e47fa1bba3445a6019acb5b9c87d0c6ad81c09e7d496682ae81fc",
        privateKey:
          "0x1c3a1e987fdabc9aeea47e457ad4db9732f7d7b6d2856d6e3f9b8d88ff6e227e",
      },
      claimFormats: [1],
      wrapperContractAddress: "0x09D16c22216BC873e53c8D93A38420f48A81dF1B",
      wrapperContractName: "exampleWrapperContractName",
      gas: 999999999999999,
    };
    const bridgeConfig = [badBesuConfig];
    expect(() =>
      validateCCConfig({
        configValue: {
          bridgeConfig,
        },
      }),
    ).toThrowError(/Invalid config\.bridgesConfig \|\| config\.oracleConfig/);
  });
});
