import axios from "axios";
import CryptoMaterial from "../crypto-material/crypto-material.json";
import { getUserFromPseudonim, getFabricId } from "./common";

const FABRIC_CHANNEL_NAME = "mychannel";
const FABRIC_CONTRACT_CBDC_ERC20_NAME = "SATPContract";
const FABRIC_CONTRACT_WRAPPER_NAME = "SATPWrapperContract";

export async function getFabricBalance(frontendUser: string) {
  const fabricID = getFabricId(frontendUser);
  let response;
  try {
    response = await axios.post(
      "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
      {
        contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
        channelName: FABRIC_CHANNEL_NAME,
        params: [fabricID],
        methodName: "ClientIDAccountBalance",
        invocationType: "FabricContractInvocationType.CALL",
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: "userA",
        },
      },
    );
  } catch (error) {
    //TODO fix
    console.error(error.msg);
    return -1;
  }
  console.log(response);

  return parseInt(response.data.functionOutput);
}

export async function mintTokensFabric(frontendUser: string, amount: string) {
  const response = await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [amount.toString()],
      methodName: "mint",
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
  try {
    const response = await axios.post(
      "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
      {
        contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
        channelName: FABRIC_CHANNEL_NAME,
        params: [to, amount.toString()],
        methodName: "transfer",
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
  } catch (error) {
    throw error;
    console.error(error);
  }
}
/*
export async function escrowTokensFabric(
  frontendUser: string,
  amount: string,
  assetRefID: string,
) {
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
}*/
/*
export async function bridgeOutTokensFabric(
  frontendUser: string,
  amount: string,
  assetRefID: string,
) {
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
    "http://localhost:4000/api/v1/@hyperledger/cactus-plugin-satp-hermes/clientrequest",
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
*/
export async function getAssetReferencesFabric(
  frontendUser: string,
): Promise<any> {
  try {
    const response = await axios.post(
      "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
      {
        contractName: FABRIC_CONTRACT_WRAPPER_NAME,
        channelName: FABRIC_CHANNEL_NAME,
        params: [],
        methodName: "getAllAssets",
        invocationType: "FabricContractInvocationType.CALL",
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: getUserFromPseudonim(frontendUser),
        },
      },
    );
    const array = Array.from(response.data.functionOutput).map((asset) => {
      return JSON.parse(asset as string);
    });
    return array
      .filter((asset: any) => typeof asset === "object")
      .map((asset: any) => {
        asset.owner = getUserFromFabricId(asset.recipient);
        return {
          id: asset.id,
          numberTokens: asset.amount,
          owner: asset.owner,
        };
      });
  } catch (error) {
    //TODO fix
    console.error(error);
    return [];
  }
}

export async function authorizeNTokensFabric(user: string, amount: string) {
  await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
    {
      contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
      channelName: FABRIC_CHANNEL_NAME,
      params: [CryptoMaterial.accounts.bridge.fabricID, amount],
      methodName: "Approve",
      invocationType: "FabricContractInvocationType.SEND",
      signingCredential: {
        keychainId: CryptoMaterial.keychains.keychain1.id,
        keychainRef: getUserFromPseudonim(user),
      },
    },
  );
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
