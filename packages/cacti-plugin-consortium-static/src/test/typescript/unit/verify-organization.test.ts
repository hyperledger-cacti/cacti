import "jest-extended";
import { SignJWT, importJWK } from "jose";
import {
  generateES256JWK,
  issueOrgToken,
  verifyOrganization,
} from "../../../main/typescript/utils";

describe("verifyOrganization", () => {
  const org = "TestOrg";
  const expFuture = Math.floor(Date.now() / 1000) + 3600;
  const expPast = Math.floor(Date.now() / 1000) - 10;

  let pub: Awaited<ReturnType<typeof generateES256JWK>>["pub"];
  let priv: Awaited<ReturnType<typeof generateES256JWK>>["priv"];

  beforeAll(async () => {
    const keys = await generateES256JWK();
    pub = keys.pub;
    priv = keys.priv;
  });

  it("accepts a valid token on first use", async () => {
    const token = await issueOrgToken(
      priv,
      { iss: org, exp: expFuture },
      "member1",
      "pubkey1",
    );
    const result = await verifyOrganization(
      token,
      pub,
      org,
      new Map<string, number>(),
    );
    expect(result).toBe(true);
  });

  it("rejects a replayed token with the same jti", async () => {
    const token = await issueOrgToken(
      priv,
      { iss: org, exp: expFuture },
      "member1",
      "pubkey1",
    );
    const seenJtis = new Map<string, number>();
    await verifyOrganization(token, pub, org, seenJtis);
    const result = await verifyOrganization(token, pub, org, seenJtis);
    expect(result).toBe(false);
  });

  it("rejects a token with wrong issuer", async () => {
    const token = await issueOrgToken(
      priv,
      { iss: "WrongOrg", exp: expFuture },
      "member1",
      "pubkey1",
    );
    const result = await verifyOrganization(
      token,
      pub,
      org,
      new Map<string, number>(),
    );
    expect(result).toBe(false);
  });

  it("rejects an expired token", async () => {
    const token = await issueOrgToken(
      priv,
      { iss: org, exp: expPast },
      "member1",
      "pubkey1",
    );
    const result = await verifyOrganization(
      token,
      pub,
      org,
      new Map<string, number>(),
    );
    expect(result).toBe(false);
  });

  it("rejects a token that has no exp claim", async () => {
    const key = await importJWK(priv, "ES256K");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256K", typ: "JWT" })
      .setIssuer(org)
      .setJti("no-exp-jti")
      .sign(key);
    const result = await verifyOrganization(
      token,
      pub,
      org,
      new Map<string, number>(),
    );
    expect(result).toBe(false);
  });

  it("accepts same jti from two different orgs (no cross-org collision)", async () => {
    const org2 = "OtherOrg";
    const keys2 = await generateES256JWK();
    const sharedJti = "shared-jti-value";

    const token1 = await issueOrgToken(
      priv,
      { iss: org, exp: expFuture, jti: sharedJti },
      "member1",
      "pubkey1",
    );
    const token2 = await issueOrgToken(
      keys2.priv,
      { iss: org2, exp: expFuture, jti: sharedJti },
      "member2",
      "pubkey2",
    );

    const seenJtis = new Map<string, number>();
    const result1 = await verifyOrganization(token1, pub, org, seenJtis);
    const result2 = await verifyOrganization(
      token2,
      keys2.pub,
      org2,
      seenJtis,
    );
    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it("skips jti tracking when seenJtis is not provided", async () => {
    const token = await issueOrgToken(
      priv,
      { iss: org, exp: expFuture },
      "member1",
      "pubkey1",
    );
    const first = await verifyOrganization(token, pub, org);
    const second = await verifyOrganization(token, pub, org);
    expect(first).toBe(true);
    expect(second).toBe(true);
  });
});
