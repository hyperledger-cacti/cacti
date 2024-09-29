import "jest-extended";
import { AddressInfo } from "net";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import bodyParser from "body-parser";
import { pruneDockerAllIfGithubAction } from "@hyperledger/cactus-test-tooling";
import {
  IListenOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  DefaultEventHandlerStrategy,
  PluginLedgerConnectorFabric,
  DeployContractGoSourceV1Request,
} from "../../../../main/typescript/public-api";
import { DefaultApi as FabricApi } from "../../../../main/typescript/public-api";
import { IPluginLedgerConnectorFabricOptions } from "../../../../main/typescript/plugin-ledger-connector-fabric";
import { DiscoveryOptions } from "fabric-network";
import { Configuration } from "@hyperledger/cactus-core-api";
import { installOpenapiValidationMiddleware } from "@hyperledger/cactus-core";
import OAS from "../../../../main/json/openapi.json";

const testCase = "check openapi validation in fabric endpoints";
const logLevel: LogLevelDesc = "TRACE";

describe(testCase, () => {
  let apiUrl: string;
  let server: http.Server;
  let plugin: PluginLedgerConnectorFabric;
  let apiClient: FabricApi;
  const fDeployGo = "deployContractGoSourceV1";
  const cWithoutParams = "not sending all required parameters";
  const cInvalidParams = "sending invalid parameters";

  // these below mirror how the fabric-samples sets up the configuration
  const org1Env = {
    CORE_PEER_LOCALMSPID: "Org1MSP",
    CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
    CORE_PEER_MSPCONFIGPATH:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp",
    CORE_PEER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
    ORDERER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
  };

  // these below mirror how the fabric-samples sets up the configuration
  const org2Env = {
    CORE_PEER_LOCALMSPID: "Org2MSP",
    CORE_PEER_ADDRESS: "peer0.org2.example.com:9051",
    CORE_PEER_MSPCONFIGPATH:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp",
    CORE_PEER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt",
    ORDERER_TLS_ROOTCERT_FILE:
      "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
  };

  beforeAll(async () => {
    const pruning = pruneDockerAllIfGithubAction({ logLevel });
    await expect(pruning).resolves.not.toThrow();
    const discoveryOptions: DiscoveryOptions = {
      enabled: true,
      asLocalhost: true,
    };
    const pluginOptions: IPluginLedgerConnectorFabricOptions = {
      instanceId: uuidv4(),
      dockerBinary: "/usr/local/bin/docker",
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      peerBinary: "/fabric-samples/bin/peer",
      cliContainerEnv: org1Env,
      sshConfig: new Configuration(),
      logLevel,
      connectionProfile: {
        name: "",
        version: "",
        organizations: {},
        peers: {},
      },
      discoveryOptions,
      eventHandlerOptions: {
        strategy: DefaultEventHandlerStrategy.NetworkScopeAllfortx,
        commitTimeout: 300,
      },
    };
    plugin = new PluginLedgerConnectorFabric(pluginOptions);

    const expressApp = express();
    expressApp.use(bodyParser.json({ limit: "250mb" }));
    server = http.createServer(expressApp);
    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
    apiUrl = `http://127.0.0.1:${addressInfo.port}`;
    const config = new Configuration({ basePath: apiUrl });
    apiClient = new FabricApi(config);

    await installOpenapiValidationMiddleware({
      logLevel,
      app: expressApp,
      apiSpec: OAS,
    });

    await plugin.getOrCreateWebServices();
    await plugin.registerWebServices(expressApp);
  });

  afterAll(async () => {
    await Servers.shutdown(server);
  });

  test(`${testCase} - ${fDeployGo} - ${cWithoutParams}`, async () => {
    const parameters = {
      tlsRootCertFiles:
        "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
      policyDslSource: "AND('Org1MSP.member','Org2MSP.member')",
      channelId: "mychannel",
      chainCodeVersion: "1.0.0",
      constructorArgs: { Args: ["john", "99"] },
      goSource: {
        body: Buffer.from("some go source code").toString("base64"),
        filename: "hello-world.go",
      },
      moduleName: "hello-world",
      targetOrganizations: [org1Env, org2Env],
      pinnedDeps: [
        "github.com/Knetic/govaluate@v3.0.0+incompatible",
        "github.com/Shopify/sarama@v1.27.0",
        "github.com/fsouza/go-dockerclient@v1.6.5",
        "github.com/grpc-ecosystem/go-grpc-middleware@v1.2.1",
        "github.com/hashicorp/go-version@v1.2.1",
        "github.com/hyperledger/fabric@v1.4.8",
        "github.com/hyperledger/fabric-amcl@v0.0.0-20200424173818-327c9e2cf77a",
        "github.com/miekg/pkcs11@v1.0.3",
        "github.com/mitchellh/mapstructure@v1.3.3",
        "github.com/onsi/ginkgo@v1.14.1",
        "github.com/onsi/gomega@v1.10.2",
        "github.com/op/go-logging@v0.0.0-20160315200505-970db520ece7",
        "github.com/pkg/errors@v0.9.1",
        "github.com/spf13/viper@v1.7.1",
        "github.com/stretchr/testify@v1.6.1",
        "github.com/sykesm/zap-logfmt@v0.0.3",
        "go.uber.org/zap@v1.16.0",
        "golang.org/x/crypto@v0.0.0-20200820211705-5c72a883971a",
        "golang.org/x/net@v0.0.0-20210503060351-7fd8e65b6420",
        "google.golang.org/grpc@v1.31.1",
      ],
    };
    await expect(
      apiClient.deployContractGoSourceV1(
        parameters as DeployContractGoSourceV1Request,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("targetPeerAddresses"),
          }),
        ]),
      }),
    });
  });
  test(`${testCase} - ${fDeployGo} - ${cInvalidParams}`, async () => {
    const parameters = {
      targetPeerAddresses: ["peer0.org1.example.com:7051"],
      tlsRootCertFiles:
        "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
      policyDslSource: "AND('Org1MSP.member','Org2MSP.member')",
      channelId: "mychannel",
      chainCodeVersion: "1.0.0",
      constructorArgs: { Args: ["john", "99"] },
      goSource: {
        body: Buffer.from("some go source code").toString("base64"),
        filename: "hello-world.go",
      },
      moduleName: "hello-world",
      targetOrganizations: [org1Env, org2Env],
      pinnedDeps: [
        "github.com/Knetic/govaluate@v3.0.0+incompatible",
        "github.com/Shopify/sarama@v1.27.0",
        "github.com/fsouza/go-dockerclient@v1.6.5",
        "github.com/grpc-ecosystem/go-grpc-middleware@v1.2.1",
        "github.com/hashicorp/go-version@v1.2.1",
        "github.com/hyperledger/fabric@v1.4.8",
        "github.com/hyperledger/fabric-amcl@v0.0.0-20200424173818-327c9e2cf77a",
        "github.com/miekg/pkcs11@v1.0.3",
        "github.com/mitchellh/mapstructure@v1.3.3",
        "github.com/onsi/ginkgo@v1.14.1",
        "github.com/onsi/gomega@v1.10.2",
        "github.com/op/go-logging@v0.0.0-20160315200505-970db520ece7",
        "github.com/pkg/errors@v0.9.1",
        "github.com/spf13/viper@v1.7.1",
        "github.com/stretchr/testify@v1.6.1",
        "github.com/sykesm/zap-logfmt@v0.0.3",
        "go.uber.org/zap@v1.16.0",
        "golang.org/x/crypto@v0.0.0-20200820211705-5c72a883971a",
        "golang.org/x/net@v0.0.0-20210503060351-7fd8e65b6420",
        "google.golang.org/grpc@v1.31.1",
      ],
      fake: 4,
    };
    await expect(
      apiClient.deployContractGoSourceV1(parameters),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 400,
        data: expect.arrayContaining([
          expect.objectContaining({
            path: expect.stringContaining("fake"),
          }),
        ]),
      }),
    });
  });
});
