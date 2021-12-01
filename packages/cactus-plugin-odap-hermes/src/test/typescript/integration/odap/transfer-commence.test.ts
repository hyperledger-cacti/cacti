import "jest-extended";
import { randomBytes } from "crypto";
import secp256k1 from "secp256k1";
import { OdapGateway } from "../../../../main/typescript/gateway/odap-gateway";
import {
  TransferCommenceV1Request,
  AssetProfile,
} from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";

test("dummy test for transfer commence flow", async () => {
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
  const dummyPrivKeyStr = odapGateWay.bufArray2HexStr(dummyPrivKeyBytes);
  const dummyPubKeyBytes = secp256k1.publicKeyCreate(dummyPrivKeyBytes);
  const dummyPubKey = odapGateWay.bufArray2HexStr(dummyPubKeyBytes);
  const dummyHash = SHA256("dummy").toString();
  const expiryDate = new Date("23/25/2060").toString();
  const assetProfile: AssetProfile = { expirationDate: expiryDate };
  const assetProfileHash = SHA256(JSON.stringify(assetProfile)).toString();
  const sessionData = {
    initializationMsgHash: dummyHash,
    clientIdentityPubkey: dummyPubKey,
    serverIdentityPubkey: dummyPubKey,
    recipientGateWayDltSystem: "dummy",
    sourceGateWayDltSystem: "dummy",
    assetProfile: assetProfile,
  };
  const sessionID = uuidV4();

  odapGateWay.sessions.set(sessionID, sessionData);

  const transferCommenceReq: TransferCommenceV1Request = {
    sessionID: sessionID,
    messageType: "urn:ietf:odap:msgtype:transfer-commence-msg",
    originatorPubkey: dummyPubKey,
    beneficiaryPubkey: dummyPubKey,
    clientIdentityPubkey: dummyPubKey,
    serverIdentityPubkey: dummyPubKey,
    hashPrevMessage: dummyHash,
    hashAssetProfile: assetProfileHash,
    senderDltSystem: "dummy",
    recipientDltSystem: "dummy",
    clientSignature: "",
  };
  transferCommenceReq.clientSignature = await odapGateWay.sign(
    JSON.stringify(transferCommenceReq),
    dummyPrivKeyStr,
  );
  expect(
    async () =>
      await odapGateWay.lockEvidenceTransferCommence(transferCommenceReq),
  ).not.toThrow();
});
