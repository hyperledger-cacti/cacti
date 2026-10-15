/**
 * Unit tests for FabricLeaf option plumbing.
 *
 * Regression coverage for the wrapper-contract endorsement policy: the
 * leaf-deployed SATP wrapper chaincode is deployed with the signature
 * policy taken from the leaf options. Before this was wired through,
 * FabricLeaf silently dropped `options.signaturePolicy`, so the wrapper
 * ran under Fabric's default MAJORITY endorsement policy and its
 * initialization intermittently failed with ENDORSEMENT_POLICY_FAILURE
 * under CI load (cacti issue #3978).
 */
import { FabricLeaf } from "../../../main/typescript/cross-chain-mechanisms/bridge/leafs/fabric-leaf";
import { OntologyManager } from "../../../main/typescript/cross-chain-mechanisms/bridge/ontology/ontology-manager";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";

const ORG_TARGET = {
  CORE_PEER_LOCALMSPID: "Org1MSP",
  CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
  CORE_PEER_MSPCONFIG: "/msp",
  CORE_PEER_TLS_ROOTCERT: "tls-ca.crt",
  ORDERER_TLS_ROOTCERT: "orderer-tls-ca.crt",
};

function makeLeaf(signaturePolicy?: string): FabricLeaf {
  const monitorService = MonitorService.createOrGetMonitorService({
    enabled: false,
  });
  monitorService.init();

  return new FabricLeaf(
    {
      networkIdentification: {
        id: "FabricLedgerTestNetwork",
        ledgerType: LedgerType.Fabric2,
      },
      leafId: "test-fabric-leaf",
      channelName: "mychannel",
      signingCredential: {
        keychainId: "test-keychain",
        keychainRef: "admin",
        type: 1,
      } as never,
      targetOrganizations: [ORG_TARGET],
      caFile: "ca.crt",
      orderer: "orderer.example.com:7050",
      ordererTLSHostnameOverride: "orderer.example.com",
      connTimeout: 60,
      mspId: "Org1MSP",
      coreYamlFile: {
        name: "core.yaml",
        content: Buffer.from("").toString("base64"),
      } as never,
      connectorOptions: {
        instanceId: "fabric-connector-test",
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: "ERROR",
        connectionProfile: {
          name: "test-network",
          version: "1.0.0",
          peers: {},
          organizations: {},
          certificateAuthorities: {},
        },
        dockerNetworkName: "host",
      } as never,
      signaturePolicy,
    } as never,
    new OntologyManager({ logLevel: "ERROR" }, monitorService),
    monitorService,
  );
}

describe("FabricLeaf option plumbing", () => {
  it("forwards options.signaturePolicy so the wrapper contract is not deployed under the default MAJORITY policy", () => {
    const loosePolicy = "OR('Org1MSP.member','Org2MSP.member')";
    const leaf = makeLeaf(loosePolicy);
    expect(
      (leaf as unknown as { signaturePolicy?: string }).signaturePolicy,
    ).toBe(loosePolicy);
  });

  it("keeps signaturePolicy undefined when the options do not carry one", () => {
    const leaf = makeLeaf(undefined);
    expect(
      (leaf as unknown as { signaturePolicy?: string }).signaturePolicy,
    ).toBeUndefined();
  });
});
