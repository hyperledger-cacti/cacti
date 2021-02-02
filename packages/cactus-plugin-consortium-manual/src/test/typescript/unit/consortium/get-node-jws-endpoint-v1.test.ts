import test, { Test } from "tape";
import { JWS, JWK } from "jose";

import { ConsortiumDatabase } from "@hyperledger/cactus-core-api";

import { ConsortiumRepository } from "@hyperledger/cactus-core";

import {
  GetNodeJwsEndpoint,
  IGetNodeJwsEndpointOptions,
} from "../../../../main/typescript/public-api";

test("Can provide JWS", async (t: Test) => {
  t.ok(GetNodeJwsEndpoint);

  const keyPair = await JWK.generate("EC", "secp256k1", { use: "sig" }, true);
  const keyPairPem = keyPair.toPEM(true);

  const db: ConsortiumDatabase = {
    cactusNode: [],
    consortium: [],
    consortiumMember: [],
    ledger: [],
    pluginInstance: [],
  };
  const consortiumRepo = new ConsortiumRepository({ db });

  const epOpts: IGetNodeJwsEndpointOptions = {
    consortiumRepo,
    keyPairPem,
  };
  const pubKeyPem = keyPair.toPEM(false);

  const ep = new GetNodeJwsEndpoint(epOpts);

  const jws = await ep.createJws();
  t.ok(jws, "created JWS is truthy");
  t.ok(typeof jws === "object", "created JWS is an object");

  t.doesNotThrow(() => JWS.verify(jws, pubKeyPem), "JWS verified OK");
  t.doesNotThrow(() => JWS.verify(jws, keyPair), "JWS verified OK");

  const payload = JWS.verify(jws, pubKeyPem) as {
    consortiumDatabase: ConsortiumDatabase;
  };
  t.ok(payload, "JWS verified payload truthy");
  if (typeof payload === "string") {
    t.fail(`JWS Verification result: ${payload}`);
  } else {
    t.ok(payload.consortiumDatabase, "JWS payload.consortiumDatabase truthy");
  }

  t.end();
});
