import { PluginOdapGateway } from "../../main/typescript/gateway/plugin-odap-gateway";
import {
  FabricContractInvocationType,
  FabricSigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  EthContractInvocationType,
  InvokeContractV1Request as BesuInvokeContractV1Request,
  Web3SigningCredential,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

export async function fabricAssetExists(
  pluginSourceGateway: PluginOdapGateway,
  fabricContractName: string,
  fabricChannelName: string,
  fabricAssetID: string,
  fabricSigningCredential: FabricSigningCredential,
): Promise<boolean | undefined> {
  const assetExists = await pluginSourceGateway.fabricApi?.runTransactionV1({
    contractName: fabricContractName,
    channelName: fabricChannelName,
    params: [fabricAssetID],
    methodName: "AssetExists",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });

  expect(assetExists).not.toBeUndefined();

  expect(assetExists?.status).toBeGreaterThan(199);
  expect(assetExists?.status).toBeLessThan(300);

  expect(assetExists?.data).not.toBeUndefined();
  return assetExists?.data.functionOutput == "true";
}

export async function isFabricAssetLocked(
  pluginSourceGateway: PluginOdapGateway,
  fabricContractName: string,
  fabricChannelName: string,
  fabricAssetID: string,
  fabricSigningCredential: FabricSigningCredential,
): Promise<boolean | undefined> {
  const assetIsLocked = await pluginSourceGateway.fabricApi?.runTransactionV1({
    contractName: fabricContractName,
    channelName: fabricChannelName,
    params: [fabricAssetID],
    methodName: "IsAssetLocked",
    invocationType: FabricContractInvocationType.Send,
    signingCredential: fabricSigningCredential,
  });

  expect(assetIsLocked).not.toBeUndefined();

  expect(assetIsLocked?.status).toBeGreaterThan(199);
  expect(assetIsLocked?.status).toBeLessThan(300);

  expect(assetIsLocked?.data).not.toBeUndefined();
  return assetIsLocked?.data.functionOutput == "true";
}

export async function besuAssetExists(
  pluginRecipientGateway: PluginOdapGateway,
  besuContractName: string,
  besuKeychainId: string,
  besuAssetID: string,
  besuWeb3SigningCredential: Web3SigningCredential,
): Promise<boolean> {
  const assetExists = await pluginRecipientGateway.besuApi?.invokeContractV1({
    contractName: besuContractName,
    invocationType: EthContractInvocationType.Call,
    methodName: "isPresent",
    gas: 1000000,
    params: [besuAssetID],
    signingCredential: besuWeb3SigningCredential,
    keychainId: besuKeychainId,
  } as BesuInvokeContractV1Request);

  expect(assetExists).not.toBeUndefined();

  expect(assetExists?.status).toBeGreaterThan(199);
  expect(assetExists?.status).toBeLessThan(300);

  return assetExists?.data.callOutput == true;
}
