import axios from "axios";
import CryptoMaterial from "../crypto-material/crypto-material.json";
import { getUserFromPseudonim, getEthAddress, getFabricId } from "./common";

const FABRIC_CHANNEL_NAME = "mychannel";
const FABRIC_CONTRACT_CBDC_ERC20_NAME = "cbdc";
const FABRIC_CONTRACT_ASSET_REF_NAME = "asset-reference-contract";

export async function getFabricBalance(frontendUser: string) {
  const fabricID = getFabricId(frontendUser);
  const response = await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [fabricID],
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

export async function mintTokensFabric(frontendUser: string, amount: string) {
  const response = await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [amount.toString()],
      methodName: "Mint",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: getUserFromPseudonim(frontendUser),
      },
    },
  );

  if (response.status === 200) {
    // throw error
  }
}

export async function transferTokensFabric(
  frontendUserFrom: string,
  frontendUserTo: string,
  amount: string,
) {
  const to = getFabricId(frontendUserTo);
  const response = await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [to, amount.toString()],
      methodName: "Transfer",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: getUserFromPseudonim(frontendUserFrom),
      },
    },
  );

  if (response.status === 200) {
    // throw error
  }
}

export async function escrowTokensFabric(frontendUser: string, amount: string, assetRefID: string) {
  const response = await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [amount.toString(), assetRefID],
      methodName: "Escrow",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: getUserFromPseudonim(frontendUser),
      },
    },
  );

  if (response.status === 200) {
    // throw error
  }
}

export async function bridgeOutTokensFabric(frontendUser: string, amount: string, assetRefID: string) {
  const fabricID = getFabricId(frontendUser);
  const address = getEthAddress(frontendUser);

  const assetProfile = {
    expirationDate: new Date(2060, 11, 24).toString(),
    issuer: "CB1",
    assetCode: "CBDC1",
    // since there is no link with the asset information,
    // we are just passing the asset parameters like this
    // [amountBeingTransferred, fabricID, ethAddress]
    keyInformationLink: [amount.toString(), fabricID, address],
  };

  await axios.post(
    "http://localhost:4000/api/v1/@hyperledger/cactus-plugin-odap-hermes/clientrequest",
    {
      clientGatewayConfiguration: {
        apiHost: `http://localhost:4000`,
      },
      serverGatewayConfiguration: {
        apiHost: `http://localhost:4100`,
      },
      version: "0.0.0",
      loggingProfile: "dummyLoggingProfile",
      accessControlProfile: "dummyAccessControlProfile",
      applicationProfile: "dummyApplicationProfile",
      payloadProfile: {
        assetProfile,
        capabilities: "",
      },
      assetProfile: assetProfile,
      assetControlProfile: "dummyAssetControlProfile",
      beneficiaryPubkey: "dummyPubKey",
      clientDltSystem: "DLT1",
      originatorPubkey: "dummyPubKey",
      recipientGatewayDltSystem: "DLT2",
      recipientGatewayPubkey: CryptoMaterial.gateways["gateway2"].publicKey,
      serverDltSystem: "DLT2",
      sourceGatewayDltSystem: "DLT1",
      clientIdentityPubkey: "",
      serverIdentityPubkey: "",
      maxRetries: 5,
      maxTimeout: 5000,
      sourceLedgerAssetID: assetRefID,
      recipientLedgerAssetID: "FABRIC_ASSET_ID",
    },
  );
}

export async function getAssetReferencesFabric(frontendUser: string) {
  const response = await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [],
      methodName: "GetAllAssetReferences",
      invocationType: "FabricContractInvocationType.CALL",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: getUserFromPseudonim(frontendUser),
      },
    },
  );

  return JSON.parse(response.data.functionOutput)
    .filter((asset: any) => typeof asset === "object")
    .map((asset: any) => {
      asset.recipient = getUserFromFabricId(asset.recipient);
      return asset;
    });
}

export function getUserFromFabricId(fabricID: string): string {
  switch (fabricID) {
    case CryptoMaterial.accounts["userA"].fabricID:
      return "Alice";
    case CryptoMaterial.accounts["userB"].fabricID:
      return "Charlie";
    case CryptoMaterial.accounts["bridge"].fabricID:
      return "Bridge";
    default:
      return "";
  }
}
