import {
  JWSAlgorithm,
  jwsSign,
  jwsVerify,
  jwsDecodePayload,
} from "../../../main/typescript/core/jws-utils";

describe("JWS utilities (TASK-064 stub)", () => {
  const sampleMessage = {
    sessionId: "test-session-123",
    messageType: 7,
    version: "v13",
  };

  describe("jwsSign", () => {
    it("produces a three-part compact serialization", () => {
      const jws = jwsSign(sampleMessage);
      const parts = jws.split(".");
      expect(parts).toHaveLength(3);
    });

    it("encodes the correct header with ES256 by default", () => {
      const jws = jwsSign(sampleMessage);
      const header = JSON.parse(
        Buffer.from(jws.split(".")[0], "base64url").toString(),
      );
      expect(header.alg).toBe("ES256");
      expect(header.typ).toBe("satp+jws");
    });

    it("encodes the message in the payload", () => {
      const jws = jwsSign(sampleMessage);
      const payload = JSON.parse(
        Buffer.from(jws.split(".")[1], "base64url").toString(),
      );
      expect(payload.sessionId).toBe("test-session-123");
      expect(payload.version).toBe("v13");
    });

    it("uses STUB_SIGNATURE as placeholder", () => {
      const jws = jwsSign(sampleMessage);
      expect(jws.split(".")[2]).toBe("STUB_SIGNATURE");
    });
  });

  describe("jwsVerify", () => {
    it("returns verified=true for any valid JWS (stub)", () => {
      const jws = jwsSign(sampleMessage);
      const result = jwsVerify(jws);
      expect(result.verified).toBe(true);
      expect(result.algorithm).toBe(JWSAlgorithm.ES256);
    });

    it("decodes the payload correctly", () => {
      const jws = jwsSign(sampleMessage);
      const result = jwsVerify(jws);
      const parsed = JSON.parse(result.payload);
      expect(parsed.sessionId).toBe("test-session-123");
    });

    it("returns verified=false for malformed input", () => {
      const result = jwsVerify("not-a-jws");
      expect(result.verified).toBe(false);
      expect(result.payload).toBe("");
    });
  });

  describe("jwsDecodePayload", () => {
    it("extracts payload without verification", () => {
      const jws = jwsSign(sampleMessage);
      const payload = jwsDecodePayload(jws);
      const parsed = JSON.parse(payload);
      expect(parsed.messageType).toBe(7);
    });

    it("returns empty string for malformed input", () => {
      expect(jwsDecodePayload("bad")).toBe("");
    });
  });
});
