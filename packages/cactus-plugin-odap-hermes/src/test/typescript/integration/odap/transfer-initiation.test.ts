import { randomBytes } from "crypto";
import secp256k1 from "secp256k1";
import { v4 as uuidV4 } from "uuid";
import { OdapGateway } from "../../../../main/typescript/gateway/odap-gateway";
import {
  TransferInitializationV1Request,
  AssetProfile,
} from "../../../../main/typescript/public-api";
test("dummy test for transfer initiation flow", async () => {
  const odapConstructor = {
    name: "cactus-plugin#odapGateway",
    dltIDs: ["dummy"],
    instanceId: uuidV4(),
  };
  const odapGateWay = new OdapGateway(odapConstructor);
  let dummyPrivKeyBytes = randomBytes(32);
  while (!secp256k1.privateKeyVerify(dummyPrivKeyBytes)) {
    dummyPrivKeyBytes = randomBytes(32);
  }
  const dummyPubKeyBytes = secp256k1.publicKeyCreate(dummyPrivKeyBytes);
  const dummyPubKey = odapGateWay.bufArray2HexStr(dummyPubKeyBytes);
  const expiryDate = new Date("23/25/2060").toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };
  const initializationRequestMessage: TransferInitializationV1Request = {
    version: "0.0.0",
    loggingProfile: "dummy",
    accessControlProfile: "dummy",
    applicationProfile: "dummy",
    payloadProfile: {
      assetProfile: assetProfile,
      capabilities: "",
    },
    initializationRequestMessageSignature: "",
    sourceGatewayPubkey: dummyPubKey,
    sourceGateWayDltSystem: "dummy",
    recipientGateWayPubkey: dummyPubKey,
    recipientGateWayDltSystem: "dummy",
  };
  const dummyPrivKeyStr = odapGateWay.bufArray2HexStr(dummyPrivKeyBytes);
  initializationRequestMessage.initializationRequestMessageSignature = await odapGateWay.sign(
    JSON.stringify(initializationRequestMessage),
    dummyPrivKeyStr,
  );
  expect(
    async () =>
      await odapGateWay.initiateTransfer(initializationRequestMessage),
  ).not.toThrow();
});
