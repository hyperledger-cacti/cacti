import axios from "axios";
import CryptoMaterial from "../crypto-material/crypto-material.json";

// Input: [Alice, Charlie, Bridge]
export function getUserFromPseudonim(user: string) {
  switch (user) {
    case "Alice":
      return "userA";
    case "Charlie":
      return "userB";
    case "Bridge":
      return "bridge";
    default:
      break;
  }
}

export function getFabricId(user: string) {
  switch (getUserFromPseudonim(user)) {
    case "userA":
      return CryptoMaterial.accounts["userA"].fabricID;
    case "userB":
      return CryptoMaterial.accounts["userB"].fabricID;
    case "bridge":
      return CryptoMaterial.accounts["bridge"].fabricID;
    default:
      break;
  }
}

export function getEthAddress(user: string) {
  switch (getUserFromPseudonim(user)) {
    case "userA":
      return CryptoMaterial.accounts["userA"].ethAddress;
    case "userB":
      return CryptoMaterial.accounts["userB"].ethAddress;
    case "bridge":
      return CryptoMaterial.accounts["bridge"].ethAddress;
    default:
      break;
  }
}

export function getEthUserPrKey(user: string) {
  switch (getUserFromPseudonim(user)) {
    case "userA":
      return CryptoMaterial.accounts["userA"].privateKey;
    case "userB":
      return CryptoMaterial.accounts["userB"].privateKey;
    case "bridge":
      return CryptoMaterial.accounts["bridge"].privateKey;
    default:
      break;
  }
}

export async function checkApiServer1Connection() {
  await axios.get("http://localhost:4000/api/v1/api-server/healthcheck");
}

export async function checkApiServer2Connection() {
  await axios.get("http://localhost:4100/api/v1/api-server/healthcheck");
}
