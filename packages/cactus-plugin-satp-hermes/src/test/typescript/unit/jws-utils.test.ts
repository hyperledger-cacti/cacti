import {
  JWSAlgorithm,
  generateSigningKeyPair,
  importSigningKey,
  jwsSign,
  jwsVerify,
  jwsDecodeProtectedHeader,
} from "../../../main/typescript/core/cryptography/jws-utils";

describe("JWS utilities (v13 ES256)", () => {
  const payload = new TextEncoder().encode(
    JSON.stringify({
      sessionId: "test-session-123",
      messageType: 7,
      version: "v13",
    }),
  );

  describe("generateSigningKeyPair", () => {
    it("produces an EC P-256 key pair as JWKs", async () => {
      const { publicKey, privateKey } = await generateSigningKeyPair();
      expect(publicKey.kty).toBe("EC");
      expect(publicKey.crv).toBe("P-256");
      expect(privateKey.kty).toBe("EC");
      expect(privateKey.crv).toBe("P-256");
      // private key must carry the private scalar, public key must not
      expect(typeof privateKey.d).toBe("string");
      expect(publicKey.d).toBeUndefined();
    });
  });

  describe("jwsSign", () => {
    it("produces a three-part compact serialization", async () => {
      const { privateKey } = await generateSigningKeyPair();
      const key = await importSigningKey(privateKey);
      const jws = await jwsSign(payload, key);
      expect(jws.split(".")).toHaveLength(3);
    });

    it("encodes an ES256 header with typ and kid", async () => {
      const { privateKey } = await generateSigningKeyPair();
      const key = await importSigningKey(privateKey);
      const jws = await jwsSign(payload, key, { kid: "gateway-a" });
      const header = jwsDecodeProtectedHeader(jws);
      expect(header.alg).toBe(JWSAlgorithm.ES256);
      expect(header.kid).toBe("gateway-a");
    });
  });

  describe("jwsVerify", () => {
    it("verifies a valid signature and returns the payload", async () => {
      const { publicKey, privateKey } = await generateSigningKeyPair();
      const priv = await importSigningKey(privateKey);
      const pub = await importSigningKey(publicKey);

      const jws = await jwsSign(payload, priv, { kid: "gateway-a" });
      const result = await jwsVerify(jws, pub);

      expect(result.verified).toBe(true);
      expect(result.protectedHeader.alg).toBe(JWSAlgorithm.ES256);
      expect(result.protectedHeader.kid).toBe("gateway-a");
      expect(Array.from(result.payload)).toEqual(Array.from(payload));
    });

    it("rejects a signature verified with the wrong public key", async () => {
      const { privateKey } = await generateSigningKeyPair();
      const other = await generateSigningKeyPair();
      const priv = await importSigningKey(privateKey);
      const wrongPub = await importSigningKey(other.publicKey);

      const jws = await jwsSign(payload, priv);
      const result = await jwsVerify(jws, wrongPub);

      expect(result.verified).toBe(false);
      expect(result.payload).toHaveLength(0);
    });

    it("rejects a tampered payload", async () => {
      const { publicKey, privateKey } = await generateSigningKeyPair();
      const priv = await importSigningKey(privateKey);
      const pub = await importSigningKey(publicKey);

      const jws = await jwsSign(payload, priv);
      const [header, , signature] = jws.split(".");
      const forgedPayload = Buffer.from(
        new TextEncoder().encode("tampered"),
      ).toString("base64url");
      const tampered = `${header}.${forgedPayload}.${signature}`;

      const result = await jwsVerify(tampered, pub);
      expect(result.verified).toBe(false);
    });

    it("returns verified=false for malformed input", async () => {
      const { publicKey } = await generateSigningKeyPair();
      const pub = await importSigningKey(publicKey);
      const result = await jwsVerify("not-a-jws", pub);
      expect(result.verified).toBe(false);
      expect(result.payload).toHaveLength(0);
    });
  });

  describe("jwsDecodeProtectedHeader", () => {
    it("returns an empty alg for malformed input", () => {
      expect(jwsDecodeProtectedHeader("bad").alg).toBe("");
    });
  });
});
