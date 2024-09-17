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
    return -1;
  }

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

export async function fetchAmountApprovedToBridge(frontendUser: string) {
  const owner = getFabricId(frontendUser);
  let response;

  try {
    response = await axios.post(
      "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
      {
        contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
        channelName: FABRIC_CHANNEL_NAME,
        params: [owner, CryptoMaterial.accounts.bridge.fabricID],
        methodName: "Allowance",
        invocationType: "FabricContractInvocationType.CALL",
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: getUserFromPseudonim(frontendUser),
        },
      },
    );
  } catch (error) {
    // there is no allowance, so we will return 0
    return 0;
  }

  return parseInt(response.data.functionOutput);
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
