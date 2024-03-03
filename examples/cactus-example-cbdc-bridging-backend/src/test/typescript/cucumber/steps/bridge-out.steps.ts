import { When, Then } from "cucumber";
import axios from "axios";
import CryptoMaterial from "../../../../crypto-material/crypto-material.json";
import {
  getUserFromPseudonim,
  getFabricId,
  getEthAddress,
  assertEqual,
  assertStringContains,
} from "./common";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

const FABRIC_CHANNEL_NAME = "mychannel";
const FABRIC_CONTRACT_ASSET_REF_NAME = "asset-reference-contract";

Then(
  "the bridged out amount in the chaincode is {int} CBDC",
  async function (amount: string) {
    const response = await axios.post(
      "http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-ledger-connector-fabric/run-transaction",
      {
        contractName: FABRIC_CONTRACT_ASSET_REF_NAME,
        channelName: FABRIC_CHANNEL_NAME,
        params: [],
        methodName: "GetBridgedOutAmount",
        invocationType: "FabricContractInvocationType.CALL",
        signingCredential: {
          keychainId: CryptoMaterial.keychains.keychain1.id,
          keychainRef: getUserFromPseudonim("bob"),
        },
      },
    );

    assertEqual(parseInt(response.data.functionOutput), amount);
  },
);

When(
  "{string} initiates bridge out of {int} CBDC referenced by id {string} to {string} address in the sidechain",
  { timeout: 60 * 1000 },
  async function (
    user: string,
    amount: number,
    assetRefID: string,
    finalUser: string,
  ) {
    const fabricID = getFabricId(user);
    const address = getEthAddress(finalUser);

    const assetProfile = {
      expirationDate: new Date(2060, 11, 24).toString(),
      issuer: "CB1",
      assetCode: "CBDC1",
      // since there is no link with the asset information,
      // we are just passing the asset parameters like this
      // [amountBeingTransferred, fabricID, ethAddress]
      keyInformationLink: [amount.toString(), fabricID, address],
    };

    const response = await axios.post(
      "http://127.0.0.1:4000/api/v1/@hyperledger/cactus-plugin-satp-hermes/clientrequest",
      {
        clientGatewayConfiguration: {
          apiHost: `http://127.0.0.1:4000`,
        },
        serverGatewayConfiguration: {
          apiHost: `http://127.0.0.1:4100`,
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
        maxRetries: MAX_RETRIES,
        maxTimeout: MAX_TIMEOUT,
        sourceLedgerAssetID: assetRefID,
        recipientLedgerAssetID: "FABRIC_ASSET_ID",
      },
    );

    assertEqual(response.status, 200);
  },
);

Then(
  "{string} tries to initiate bridge out of {int} CBDC referenced by id {string} to {string} address in the sidechain and operation fails because {string}",
  { timeout: 60 * 1000 },
  async function (
    user: string,
    amount: number,
    assetRefID: string,
    finalUser: string,
    failureReason: string,
  ) {
    const fabricID = getFabricId(user);
    const address = getEthAddress(finalUser);

    const assetProfile = {
      expirationDate: new Date(2060, 11, 24).toString(),
      issuer: "CB1",
      assetCode: "CBDC1",
      // since there is no link with the asset information,
      // we are just passing the asset parameters like this
      // [amountBeingTransferred, fabricID, ethAddress]
      keyInformationLink: [amount.toString(), fabricID, address],
    };

    await axios
      .post(
        "http://127.0.0.1:4000/api/v1/@hyperledger/cactus-plugin-satp-hermes/clientrequest",
        {
          clientGatewayConfiguration: {
            apiHost: `http://127.0.0.1:4000`,
          },
          serverGatewayConfiguration: {
            apiHost: `http://127.0.0.1:4100`,
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
          maxRetries: MAX_RETRIES,
          maxTimeout: MAX_TIMEOUT,
          sourceLedgerAssetID: assetRefID,
          recipientLedgerAssetID: "BESU_ASSET_ID",
        },
      )
      .catch((err) => {
        assertStringContains(err.response.data.error, failureReason);
      });
  },
);
