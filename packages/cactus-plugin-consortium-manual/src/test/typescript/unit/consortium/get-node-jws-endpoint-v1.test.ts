import test, { Test } from "tape";
import { JWS, JWK } from "jose";
import { v4 as uuidV4 } from "uuid";

import {
  CactusNode,
  Consortium,
  ConsortiumMember,
} from "@hyperledger/cactus-core-api";

import {
  GetNodeJwsEndpoint,
  IGetNodeJwsEndpointOptions,
} from "../../../../main/typescript/public-api";

test("Can provide JWS", async (t: Test) => {
  t.ok(GetNodeJwsEndpoint);

  const keyPair = await JWK.generate("EC", "secp256k1", { use: "sig" }, true);
  const keyPairPem = keyPair.toPEM(true);

  const consortiumName = "Example Corp. & Friends Crypto Consortium";
  const consortiumId = uuidV4();
  const memberId = uuidV4();
  const nodeId = uuidV4();

  const cactusNode: CactusNode = {
    nodeApiHost: "http://127.0.0.1:80",
    memberId,
    publicKeyPem: keyPair.toPEM(false),
    consortiumId,
    id: nodeId,
    plugins: [],
    ledgers: [],
  };

  const member: ConsortiumMember = {
    id: memberId,
    nodes: [cactusNode],
    name: "Example Corp",
  };

  const consortium: Consortium = {
    id: consortiumId,
    name: consortiumName,
    mainApiHost: "http://127.0.0.1:80",
    members: [member],
  };

  const epOpts: IGetNodeJwsEndpointOptions = {
    consortium,
    keyPairPem,
    path: "/some-fake-path-for-http-requests",
  };
  const pubKeyPem = keyPair.toPEM(false);

  const ep = new GetNodeJwsEndpoint(epOpts);

  const jws = await ep.createJws();
  t.ok(jws, "created JWS is truthy");
  t.ok(typeof jws === "object", "created JWS is an object");

  t.doesNotThrow(() => JWS.verify(jws, pubKeyPem), "JWS verified OK");
  t.doesNotThrow(() => JWS.verify(jws, keyPair), "JWS verified OK");

  const payload = JWS.verify(jws, pubKeyPem) as any;
  t.ok(payload, "JWS verified payload truthy");
  if (typeof payload === "string") {
    t.fail(`JWS Verification result: ${payload}`);
  } else {
    t.ok(payload.consortium, "JWS payload.consortium truthy");
  }

  t.end();
});
