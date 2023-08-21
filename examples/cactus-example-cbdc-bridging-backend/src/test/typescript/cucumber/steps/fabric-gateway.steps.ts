import { Given, When, Then, Before, After } from "cucumber";
import { expect } from "chai";
import axios from "axios";
import CryptoMaterial from "../../../../crypto-material/crypto-material.json";
import { getEthAddress, getFabricId, getUserFromPseudonim } from "./common";
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

Given("{string} with {int} CBDC available in the source chain", async function (
  user: string,
  amount: number,
) {
  await axios.post(
    "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
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

  expect(await getFabricBalance(getFabricId(user))).to.equal(amount);
});

When(
  "{string} escrows {int} CBDC and creates an asset reference with id {string} in the source chain",
  async function (user: string, amount: number, assetRefID: string) {
    await axios.post(
      "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
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

When("bob refunds {int} CBDC to {string} in the source chain", async function (
  amount: number,
  userTo: string,
) {
  const finalUserFabricID = getFabricId(userTo);
  const finalUserEthAddress = getEthAddress(userTo);

  await refundFabricTokens(finalUserFabricID, amount, finalUserEthAddress);
});

Then(
  "{string} fails to lock the asset reference with id {string} in the source chain",
  async function (user: string, assetRefID: string) {
    return axios
      .post(
        "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
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
        expect(err.response.statusText).to.contain(
          `client is not authorized to perform the operation`,
        );
      });
  },
);

Then("{string} fails to transfer {int} CBDC to {string}", async function (
  userFrom: string,
  amount: number,
  userTo: string,
) {
  const recipient = getFabricId(userTo);

  axios
    .post(
      "http://localhost:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
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
      expect(err.response.statusText).to.contain("has insufficient funds");
    });
});

Then("{string} has {int} CBDC available in the source chain", async function (
  user: string,
  amount: number,
) {
  expect(await getFabricBalance(getFabricId(user))).to.equal(amount);
});

Then(
  "the asset reference chaincode has an asset reference with id {string}",
  async function (assetRefID: string) {
    expect(await readFabricAssetReference(assetRefID)).to.not.be.undefined;
  },
);

Then(
  "the asset reference with id {string} is locked in the source chain",
  async function (assetRefID: string) {
    expect((await readFabricAssetReference(assetRefID)).isLocked).to.equal(
      true,
    );
  },
);

Then(
  "the asset reference chaincode has no asset reference with id {string}",
  async function (assetRefID: string) {
    expect(await fabricAssetReferenceExists(assetRefID)).to.equal("false");
  },
);
