import axios from "axios";
import CryptoMaterial from "../crypto-material/crypto-material.json";
import { getEthAddress, getEthUserPrKey } from "./common";

const BESU_CONTRACT_CBDC_ERC20_NAME = "SATPContract";
const BESU_CONTRACT_WRAPPER_NAME = "SATPWrapperContract";

export async function authorizeNTokensBesu(
  frontendUserFrom: string,
  amount: number,
) {
  const response = await fetch("http://localhost:9999/wrapper-address");
  const data = await response.json();
  const wrapperAddress = data.address;

  const from = getEthAddress(frontendUserFrom);
  const res = await axios.post(
    "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
    {
      contractName: BESU_CONTRACT_CBDC_ERC20_NAME,
      invocationType: "SEND",
      methodName: "approve",
      gas: 1000000,
      params: [wrapperAddress, amount],
      signingCredential: {
        ethAccount: from,
        secret: getEthUserPrKey(frontendUserFrom),
        type: "PRIVATE_KEY_HEX",
      },
      keychainId: CryptoMaterial.keychains.keychain2.id,
    },
  );
  if (res.status !== 200) {
    throw Error(res.status + " :" + res.data);
  }
}

export async function transferTokensBesu(
  frontendUserFrom: string,
  frontendUserTo: string,
  amount: number,
) {
  const from = getEthAddress(frontendUserFrom);
  const to = getEthAddress(frontendUserTo);
  try {
    await axios.post(
      "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
      {
        contractName: BESU_CONTRACT_CBDC_ERC20_NAME,
        invocationType: "SEND",
        methodName: "transfer",
        gas: 1000000,
        params: [to, amount],
        signingCredential: {
          ethAccount: from,
          secret: getEthUserPrKey(frontendUserFrom),
          type: "PRIVATE_KEY_HEX",
        },
        keychainId: CryptoMaterial.keychains.keychain2.id,
      },
    );
  } catch (error) {
    console.error(error);
  }
}

/*
export async function escrowTokensBesu(
  frontendUserFrom: string,
  amount: number,
  assetRefID: string,
) {
  const from = getEthAddress(frontendUserFrom);

  await axios.post(
    "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
    {
      contractName: BESU_CONTRACT_CBDC_ERC20_NAME,
      invocationType: "SEND",
      methodName: "escrow",
      gas: 1000000,
      params: [amount, assetRefID],
      signingCredential: {
        ethAccount: from,
        secret: getEthUserPrKey(frontendUserFrom),
        type: "PRIVATE_KEY_HEX",
      },
      keychainId: CryptoMaterial.keychains.keychain2.id,
    },
  );
}
*/

export async function getAssetReferencesBesu(frontendUser: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const from = getEthAddress(frontendUser);
  try {
    const response = await axios.post(
      "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
      {
        contractName: BESU_CONTRACT_WRAPPER_NAME,
        invocationType: "CALL",
        methodName: "getAllAssets",
        gas: 1000000,
        params: [],
        signingCredential: {
          ethAccount: CryptoMaterial.accounts.bridge.ethAddress,
          secret: getEthUserPrKey("bridge"),
          type: "PRIVATE_KEY_HEX",
        },
        keychainId: CryptoMaterial.keychains.keychain2.id,
      },
    );

    return response.data.callOutput.map((asset: any) => {
      return {
        id: asset[2],
        numberTokens: asset[4],
        owner: getUserFromEthAddress(asset[3]),
      };
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

/*
export async function bridgeBackTokensBesu(
  frontendUser: string,
  amount: number,
  assetRefID: string,
) {
  const address = getEthAddress(frontendUser);
  const fabricID = getFabricId(frontendUser);

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
    "http://localhost:4100/api/v1/@hyperledger/cactus-plugin-satp-hermes/clientrequest",
    {
      clientGatewayConfiguration: {
        apiHost: `http://localhost:4100`,
      },
      serverGatewayConfiguration: {
        apiHost: `http://localhost:4000`,
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
      clientDltSystem: "DLT2",
      originatorPubkey: "dummyPubKey",
      recipientGatewayDltSystem: "DLT1",
      recipientGatewayPubkey: CryptoMaterial.gateways["gateway1"].publicKey,
      serverDltSystem: "DLT1",
      sourceGatewayDltSystem: "DLT2",
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
export async function getBesuBalance(frontendUser: string) {
  const userEthAddress = getEthAddress(frontendUser);

  try {
    const response = await axios.post(
      "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
      {
        contractName: BESU_CONTRACT_CBDC_ERC20_NAME,
        invocationType: "CALL",
        methodName: "checkBalance",
        gas: 900000000,
        params: [userEthAddress],
        signingCredential: {
          ethAccount: userEthAddress,
          secret: getEthUserPrKey(frontendUser),
          type: "PRIVATE_KEY_HEX",
        },
        keychainId: CryptoMaterial.keychains.keychain2.id,
      },
    );

    return parseInt(response.data.callOutput);
  } catch (error) {
    console.error(error);
    return -1;
  }
}
export async function mintTokensBesu(user: string, amount: number) {
  const userEthAddress = getEthAddress(user);
  try {
    await axios.post(
      "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
      {
        contractName: BESU_CONTRACT_CBDC_ERC20_NAME,
        keychainId: CryptoMaterial.keychains.keychain2.id,
        invocationType: "SEND",
        methodName: "mint",
        params: [userEthAddress, amount],
        signingCredential: {
          ethAccount: getEthAddress("Bridge"),
          secret: getEthUserPrKey("Bridge"),
          type: "PRIVATE_KEY_HEX",
        },
        gas: 1000000,
      },
    );
  } catch (error) {
    console.error(error.msg);
  }
}

function getUserFromEthAddress(ethAddress: string) {
  switch (ethAddress) {
    case CryptoMaterial.accounts["userA"].ethAddress:
      return "Alice";
    case CryptoMaterial.accounts["userB"].ethAddress:
      return "Charlie";
    case CryptoMaterial.accounts["bridge"].ethAddress:
      return "Bridge";
    default:
      break;
  }
}
