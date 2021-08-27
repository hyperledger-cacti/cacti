import test, { Test } from "tape";
import { randomBytes } from "crypto";
import secp256k1 from "secp256k1";
import { OdapGateway } from "../../../../main/typescript/gateway/odap-gateway";
import { LockEvidenceV1Request } from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";

test("dummy test for lock evidence flow", async (t: Test) => {
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
  const dummyCommenceAckHash = SHA256("dummyAck").toString();
  const sessionData = {
    clientIdentityPubkey: dummyPubKey,
    serverIdentityPubkey: dummyPubKey,
    commenceAckHash: dummyCommenceAckHash,
  };
  const sessionID = uuidV4();

  odapGateWay.sessions.set(sessionID, sessionData);
  const lockEvidenceReq: LockEvidenceV1Request = {
    sessionID: sessionID,
    messageType: "urn:ietf:odap:msgtype:lock-evidence-req-msg",
    clientIdentityPubkey: dummyPubKey,
    serverIdentityPubkey: dummyPubKey,
    clientSignature: "",
    hashCommenceAckRequest: dummyCommenceAckHash,
    lockEvidenceClaim: " ",
    lockEvidenceExpiration: " ",
  };
  lockEvidenceReq.clientSignature = await odapGateWay.sign(
    JSON.stringify(lockEvidenceReq),
    dummyPrivKeyStr,
  );
  t.doesNotThrow(
    async () => await odapGateWay.lockEvidence(lockEvidenceReq),
    "does not throw if lock evidence proccessed",
  );
});
