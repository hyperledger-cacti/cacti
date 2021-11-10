import test, { Test } from "tape";
import { randomBytes } from "crypto";
import secp256k1 from "secp256k1";
import { OdapGateway } from "../../../../main/typescript/gateway/odap-gateway";
import { CommitFinalV1Request } from "../../../../main/typescript/generated/openapi/typescript-axios/api";
import { v4 as uuidV4 } from "uuid";
import { SHA256 } from "crypto-js";

test("dummy test for commit final flow", async (t: Test) => {
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
  const dummyCommitPrepareHash = SHA256("dummyprepare").toString();
  const sessionData = {
    clientIdentityPubkey: dummyPubKey,
    serverIdentityPubkey: dummyPubKey,
    commitPrepareAckHash: dummyCommitPrepareHash,
  };
  const sessionID = uuidV4();

  odapGateWay.sessions.set(sessionID, sessionData);
  const commitFinalReq: CommitFinalV1Request = {
    sessionID: sessionID,
    messageType: "urn:ietf:odap:msgtype:commit-final-msg",
    clientIdentityPubkey: dummyPubKey,
    serverIdentityPubkey: dummyPubKey,
    clientSignature: "",
    hashCommitPrepareAck: dummyCommitPrepareHash,
    commitFinalClaim: "",
  };
  commitFinalReq.clientSignature = await odapGateWay.sign(
    JSON.stringify(commitFinalReq),
    dummyPrivKeyStr,
  );
  t.doesNotThrow(
    async () => await odapGateWay.CommitFinal(commitFinalReq),
    "does not throw if lock evidence proccessed",
  );
});
