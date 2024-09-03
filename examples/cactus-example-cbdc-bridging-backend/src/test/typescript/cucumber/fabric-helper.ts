import axios from "axios";
import { getUserFromPseudonim } from "./steps/common";
import CryptoMaterial from "../../../crypto-material/crypto-material.json";

const FABRIC_CHANNEL_NAME = "mychannel";
const FABRIC_CONTRACT_CBDC_ERC20_NAME = "cbdc";
const FABRIC_CONTRACT_ASSET_REF_NAME = "asset-reference-contract";

export async function getFabricBalance(identity: string): Promise<number> {
  const response = await axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [identity],
      methodName: "BalanceOf",
      invocationType: "FabricContractInvocationType.CALL",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: "userA",
      },
    },
  );

  return parseInt(response.data.functionOutput);
}

export async function readFabricAssetReference(
  assetRefID: string,
): Promise<any> {
  const response = await axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [assetRefID],
      methodName: "ReadAssetReference",
      invocationType: "FabricContractInvocationType.CALL",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: "userA",
      },
    },
  );

  return JSON.parse(response.data.functionOutput);
}

export async function fabricAssetReferenceExists(
  assetRefID: string,
): Promise<string> {
  const response = await axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [assetRefID],
      methodName: "AssetReferenceExists",
      invocationType: "FabricContractInvocationType.CALL",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: "userA",
      },
    },
  );

  return response.data.functionOutput;
}

export async function lockFabricAssetReference(
  user: string,
  assetRefID: string,
): Promise<any> {
  return axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [assetRefID],
      methodName: "LockAssetReference",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: getUserFromPseudonim(user),
      },
    },
  );
}

export async function deleteFabricAssetReference(
  user: string,
  assetRefID: string,
): Promise<any> {
  return axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [assetRefID],
      methodName: "DeleteAssetReference",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: getUserFromPseudonim(user),
      },
    },
  );
}

export async function refundFabricTokens(
  finalUserFabricID: string,
  amount: number,
  finalUserEthAddress: string,
): Promise<any> {
  return axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [amount.toString(), finalUserFabricID, finalUserEthAddress],
      methodName: "Refund",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: "bridge",
      },
    },
  );
}

export async function resetFabric(): Promise<void> {
  await axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [],
      methodName: "ResetState",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: "userA",
      },
    },
  );

  await axios.post(
    "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [],
      methodName: "ResetState",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: "userA",
      },
    },
  );
}
