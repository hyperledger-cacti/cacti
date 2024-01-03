import axios from "axios";
import CryptoMaterial from "../crypto-material/crypto-material.json";
import { getEthAddress, getEthUserPrKey, getFabricId } from "./common";

const BESU_CONTRACT_CBDC_ERC20_NAME = "CBDCcontract";
const BESU_CONTRACT_ASSET_REF_NAME = "AssetReferenceContract";

export async function transferTokensBesu(
  frontendUserFrom: string,
  frontendUserTo: string,
  amount: number,
) {
  const from = getEthAddress(frontendUserFrom);
  const to = getEthAddress(frontendUserTo);
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
}

export async function escrowTokensBesu(
  frontendUserFrom: string,
  amount: number,
  assetRefID: string
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

export async function getAssetReferencesBesu(frontendUser: string) {
  const from = getEthAddress(frontendUser);

  const response = await axios.post(
    "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
    {
      contractName: BESU_CONTRACT_ASSET_REF_NAME,
      invocationType: "CALL",
      methodName: "getAllAssetReferences",
      gas: 1000000,
      params: [],
      signingCredential: {
        ethAccount: from,
        secret: getEthUserPrKey(frontendUser),
        type: "PRIVATE_KEY_HEX",
      },
      keychainId: CryptoMaterial.keychains.keychain2.id,
    },
  );

  return response.data.callOutput.map((asset: any) => {
    return {
      id: asset[0],
      numberTokens: asset[2],
      recipient: getUserFromEthAddress(asset[3]),
    };
  });
}

export async function bridgeBackTokensBesu(frontendUser: string, amount: number, assetRefID: string) {
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
    "http://localhost:4100/api/v1/@hyperledger/cactus-plugin-odap-hermes/clientrequest",
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

export async function getBesuBalance(frontendUser: string) {
  const userEthAddress = getEthAddress(frontendUser);

  const response = await axios.post(
    "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
    {
      contractName: BESU_CONTRACT_CBDC_ERC20_NAME,
      invocationType: "CALL",
      methodName: "balanceOf",
      gas: 1000000,
      params: [userEthAddress],
      signingCredential: {
        ethAccount: CryptoMaterial.accounts["bridge"].ethAddress,
        secret: CryptoMaterial.accounts["bridge"].privateKey,
        type: "PRIVATE_KEY_HEX",
      },
      keychainId: CryptoMaterial.keychains.keychain2.id,
    },
  );

  return parseInt(response.data.callOutput);
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
