import axios from "axios";
import CryptoMaterial from "../crypto-material/crypto-material.json";
import { getEthAddress, getEthUserPrKey } from "./common";

const BESU_CONTRACT_CBDC_ERC20_NAME = "SATPContract";

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

export async function fetchAmountApprovedToBridge(frontendUser: string) {
  const response = await fetch("http://localhost:9999/wrapper-address");
  const data = await response.json();
  const wrapperAddress = data.address;

  try {
    const from = getEthAddress(frontendUser);
    const response = await axios.post(
      "http://localhost:4100/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-besu/invoke-contract",
      {
        contractName: BESU_CONTRACT_CBDC_ERC20_NAME,
        invocationType: "CALL",
        methodName: "allowance",
        gas: 1000000,
        params: [from, wrapperAddress],
        signingCredential: {
          ethAccount: from,
          secret: getEthUserPrKey(frontendUser),
          type: "PRIVATE_KEY_HEX",
        },
        keychainId: CryptoMaterial.keychains.keychain2.id,
      },
    );
    return parseInt(response.data.callOutput);
  } catch (error) {
    // there is no allowance, so we will return 0
    return 0;
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

export function getUserFromEthAddress(ethAddress: string) {
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
