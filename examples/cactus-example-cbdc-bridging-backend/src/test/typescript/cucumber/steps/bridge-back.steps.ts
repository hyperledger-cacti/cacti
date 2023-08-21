import { Then } from "cucumber";
import { expect } from "chai";
import axios from "axios";
import CryptoMaterial from "../../../../crypto-material/crypto-material.json";
import { getFabricId, getEthAddress } from "./common";

const MAX_RETRIES = 5;
const MAX_TIMEOUT = 5000;

Then(
  "{string} initiates bridge back of {int} CBDC referenced by id {string} to {string} address in the source chain",
  { timeout: 60 * 1000 },
  async function (
    user: string,
    amount: number,
    assetRefID: string,
    finalUser: string,
  ) {
    const address = getEthAddress(user);
    const fabricID = getFabricId(finalUser);

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
        maxRetries: MAX_RETRIES,
        maxTimeout: MAX_TIMEOUT,
        sourceLedgerAssetID: assetRefID,
        recipientLedgerAssetID: "FABRIC_ASSET_ID",
      },
    );

    expect(response.status).to.equal(200);
  },
);

Then(
  "{string} fails to initiate bridge back of {int} CBDC referenced by id {string} to {string} address in the source chain",
  { timeout: 60 * 1000 },
  async function (
    user: string,
    amount: number,
    assetRefID: string,
    finalUser: string,
  ) {
    const address = getEthAddress(user);
    const fabricID = getFabricId(finalUser);

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
          maxRetries: MAX_RETRIES,
          maxTimeout: MAX_TIMEOUT,
          sourceLedgerAssetID: assetRefID,
          recipientLedgerAssetID: "FABRIC_ASSET_ID",
        },
      )
      .catch((err) => {
        expect(err.response.status).to.equal(500);
      });
  },
);
