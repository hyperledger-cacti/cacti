import { Given, When, Then, Before, After } from "cucumber";
import axios from "axios";
import CryptoMaterial from "../../../../crypto-material/crypto-material.json";
import {
  getEthAddress,
  getFabricId,
  getUserFromPseudonim,
  assertEqual,
  assertNonNullish,
  assertStringContains,
} from "./common";
import {
  deleteFabricAssetReference,
  fabricAssetReferenceExists,
  getFabricBalance,
  lockFabricAssetReference,
  readFabricAssetReference,
  resetFabric,
  refundFabricTokens,
} from "../fabric-helper";

const FABRIC_CHANNEL_NAME = "mychannel";
const FABRIC_CONTRACT_CBDC_ERC20_NAME = "cbdc";
const FABRIC_CONTRACT_ASSET_REF_NAME = "asset-reference-contract";

Before({ timeout: 20 * 1000, tags: "@fabric" }, async function () {
  await resetFabric();
});

After({ timeout: 20 * 1000, tags: "@fabric" }, async function () {
  await resetFabric();
});

Given(
  "{string} with {int} CBDC available in the source chain",
  { timeout: 10 * 1000 },
  async function (user: string, amount: number) {
    await axios.post(
      "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
      {
        contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
        channelName: FABRIC_CHANNEL_NAME,
        params: [amount.toString()],
        methodName: "Mint",
        invocationType: "FabricContractInvocationType.SEND",
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: getUserFromPseudonim("alice"),
        },
      },
    );

    assertEqual(await getFabricBalance(getFabricId(user)), amount);
  },
);

When(
  "{string} escrows {int} CBDC and creates an asset reference with id {string} in the source chain",
  { timeout: 10 * 1000 },
  async function (user: string, amount: number, assetRefID: string) {
    await axios.post(
      "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
      {
        contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
        channelName: FABRIC_CHANNEL_NAME,
        params: [amount.toString(), assetRefID],
        methodName: "Escrow",
        invocationType: "FabricContractInvocationType.SEND",
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: getUserFromPseudonim(user),
        },
      },
    );
  },
);

When(
  "{string} locks the asset reference with id {string} in the source chain",
  { timeout: 10 * 1000 },
  async function (user: string, assetRefID: string) {
    await lockFabricAssetReference(user, assetRefID);
  },
);

When(
  "{string} locks and deletes an asset reference with id {string} in the source chain",
  { timeout: 10 * 1000 },
  async function (user: string, assetRefID: string) {
    await lockFabricAssetReference(user, assetRefID);
    await deleteFabricAssetReference(user, assetRefID);
  },
);

When(
  "bob refunds {int} CBDC to {string} in the source chain",
  { timeout: 10 * 1000 },
  async function (amount: number, userTo: string) {
    const finalUserFabricID = getFabricId(userTo);
    const finalUserEthAddress = getEthAddress(userTo);

    await refundFabricTokens(finalUserFabricID, amount, finalUserEthAddress);
  },
);

Then(
  "{string} fails to lock the asset reference with id {string} in the source chain",
  { timeout: 10 * 1000 },
  async function (user: string, assetRefID: string) {
    return axios
      .post(
        "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
        {
          contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
          channelName: FABRIC_CHANNEL_NAME,
          params: [assetRefID],
          methodName: "LockAssetReference",
          invocationType: "FabricContractInvocationType.CALL",
          signingCredential: {
            keychainId: CryptoMaterial.keychains.keychain1.id,
            keychainRef: getUserFromPseudonim(user),
          },
        },
      )
      .catch((err) => {
        assertStringContains(
          err.response.data.error,
          `client is not authorized to perform the operation`,
        );
      });
  },
);

Then(
  "{string} fails to transfer {int} CBDC to {string}",
  { timeout: 10 * 1000 },
  async function (userFrom: string, amount: number, userTo: string) {
    const recipient = getFabricId(userTo);

    axios
      .post(
        "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
        {
          contractName: FABRIC_CONTRACT_CBDC_ERC20_NAME,
          channelName: FABRIC_CHANNEL_NAME,
          params: [recipient, amount.toString()],
          methodName: "Transfer",
          invocationType: "FabricContractInvocationType.CALL",
          signingCredential: {
            keychainId: CryptoMaterial.keychains.keychain1.id,
            keychainRef: getUserFromPseudonim(userFrom),
          },
        },
      )
      .catch((err) => {
        assertStringContains(err.response.data.error, `has insufficient funds`);
      });
  },
);

Then(
  "{string} has {int} CBDC available in the source chain",
  { timeout: 10 * 1000 },
  async function (user: string, amount: number) {
    assertEqual(await getFabricBalance(getFabricId(user)), amount);
  },
);

Then(
  "the asset reference chaincode has an asset reference with id {string}",
  { timeout: 10 * 1000 },
  async function (assetRefID: string) {
    assertNonNullish(await readFabricAssetReference(assetRefID));
  },
);

Then(
  "the asset reference with id {string} is locked in the source chain",
  { timeout: 10 * 1000 },
  async function (assetRefID: string) {
    assertEqual((await readFabricAssetReference(assetRefID)).isLocked, true);
  },
);

Then(
  "the asset reference chaincode has no asset reference with id {string}",
  { timeout: 10 * 1000 },
  async function (assetRefID: string) {
    assertEqual(await fabricAssetReferenceExists(assetRefID), "false");
  },
);
