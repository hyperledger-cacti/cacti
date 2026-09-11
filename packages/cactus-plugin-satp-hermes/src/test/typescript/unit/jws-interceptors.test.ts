import { create, toBinary } from "@bufbuild/protobuf";
import { Code } from "@connectrpc/connect";
import type { Interceptor, UnaryRequest } from "@connectrpc/connect";

import { TransferProposalRequestSchema } from "../../../main/typescript/generated/proto/cacti/satp/v13/service/stage_1_pb";
import { CommonSatpSchema } from "../../../main/typescript/generated/proto/cacti/satp/v13/common/message_pb";
import {
  SATP_SIGNATURE,
  createSignatureSigningInterceptor,
  createSignatureVerificationInterceptor,
} from "../../../main/typescript/core/cryptography/jws-interceptors";
import {
  generateSigningKeyPair,
  importSigningKey,
  jwsSign,
  type CryptoKey,
  type JWK,
} from "../../../main/typescript/core/cryptography/jws-utils";

type StageMessage = ReturnType<
  typeof create<typeof TransferProposalRequestSchema>
>;

function makeUnaryRequest(
  message: StageMessage,
  header: Headers = new Headers(),
): UnaryRequest {
  return {
    stream: false,
    header,
    method: { input: TransferProposalRequestSchema },
    message,
  } as unknown as UnaryRequest;
}

async function runInterceptor(
  interceptor: Interceptor,
  req: UnaryRequest,
): Promise<UnaryRequest> {
  let seen = req;
  const next = async (r: UnaryRequest): Promise<never> => {
    seen = r;
    return undefined as never;
  };
  await interceptor(next as never)(req);
  return seen;
}

describe("JWS signing/verification interceptors (v13)", () => {
  const gatewayId = "gateway-a";
  let priv: CryptoKey;
  let pub: CryptoKey;
  let publicJwk: JWK;
  let signing: Interceptor;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateSigningKeyPair();
    const encoder = new TextEncoder();
    const testPayload = encoder.encode("test payload");
    priv = await importSigningKey(privateKey);
    pub = await importSigningKey(publicKey);
    publicJwk = publicKey;
    signing = createSignatureSigningInterceptor({
      getPrivateKey: async () => priv,
      getPublicJwk: async () => publicJwk,
      gatewayId,
    });
    const testSignature = await jwsSign(testPayload, priv);
    expect(testSignature).toBeDefined();
  });

  it("signs a request and places a JWS in the SATP_SIGNATURE header", async () => {
    const message = create(TransferProposalRequestSchema, {});
    const req = await runInterceptor(signing, makeUnaryRequest(message));
    const jws = req.header.get(SATP_SIGNATURE);
    expect(jws).toBeTruthy();
    expect(jws?.split(".")).toHaveLength(3);
  });

  it("verifies a signature produced by the signing interceptor", async () => {
    const message = create(TransferProposalRequestSchema, {});
    const signed = await runInterceptor(signing, makeUnaryRequest(message));

    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async (kid) => (kid === gatewayId ? pub : undefined),
    });

    const serverHeader = new Headers();
    serverHeader.set(SATP_SIGNATURE, signed.header.get(SATP_SIGNATURE)!);
    const serverReq = makeUnaryRequest(message, serverHeader);

    await expect(
      runInterceptor(verification, serverReq),
    ).resolves.toBeDefined();
  });

  it("rejects a request with no signature header", async () => {
    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async () => pub,
    });
    const req = makeUnaryRequest(create(TransferProposalRequestSchema, {}));
    await expect(runInterceptor(verification, req)).rejects.toMatchObject({
      code: Code.Unauthenticated,
    });
  });

  it("verifies using the embedded public JWK when no key is pinned", async () => {
    const message = create(TransferProposalRequestSchema, {});
    const signed = await runInterceptor(signing, makeUnaryRequest(message));

    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async () => undefined,
    });
    const serverHeader = new Headers();
    serverHeader.set(SATP_SIGNATURE, signed.header.get(SATP_SIGNATURE)!);

    await expect(
      runInterceptor(verification, makeUnaryRequest(message, serverHeader)),
    ).resolves.toBeDefined();
  });

  it("rejects when no key is pinned and no JWK is embedded", async () => {
    const message = create(TransferProposalRequestSchema, {});
    const bytes = toBinary(TransferProposalRequestSchema, message);
    // A JWS signed without an embedded public JWK.
    const unsignedHeaderJws = await jwsSign(bytes, priv, {
      kid: "unknown-gateway",
    });

    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async () => undefined,
    });
    const serverHeader = new Headers();
    serverHeader.set(SATP_SIGNATURE, unsignedHeaderJws);

    await expect(
      runInterceptor(verification, makeUnaryRequest(message, serverHeader)),
    ).rejects.toMatchObject({ code: Code.Unauthenticated });
  });

  it("rejects when the embedded JWK differs from the pinned key", async () => {
    const message = create(TransferProposalRequestSchema, {});
    // Signed by a different key pair than the pinned one, embedding its
    // own public JWK.
    const rogue = await generateSigningKeyPair();
    const roguePriv = await importSigningKey(rogue.privateKey);
    const bytes = toBinary(TransferProposalRequestSchema, message);
    const rogueJws = await jwsSign(bytes, roguePriv, {
      kid: gatewayId,
      jwk: rogue.publicKey,
    });

    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async () => pub,
      resolvePinnedJwk: async () => publicJwk,
    });
    const serverHeader = new Headers();
    serverHeader.set(SATP_SIGNATURE, rogueJws);

    await expect(
      runInterceptor(verification, makeUnaryRequest(message, serverHeader)),
    ).rejects.toMatchObject({ code: Code.Unauthenticated });
  });

  it("verifies with a pinned key whose JWK matches the embedded one", async () => {
    const message = create(TransferProposalRequestSchema, {});
    const signed = await runInterceptor(signing, makeUnaryRequest(message));

    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async () => pub,
      resolvePinnedJwk: async () => publicJwk,
    });
    const serverHeader = new Headers();
    serverHeader.set(SATP_SIGNATURE, signed.header.get(SATP_SIGNATURE)!);

    await expect(
      runInterceptor(verification, makeUnaryRequest(message, serverHeader)),
    ).resolves.toBeDefined();
  });

  it("rejects when the received message does not match the signed payload", async () => {
    const message = create(TransferProposalRequestSchema, {});
    const signed = await runInterceptor(signing, makeUnaryRequest(message));

    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async (kid) => (kid === gatewayId ? pub : undefined),
    });

    // Different message body than the one that was signed.
    const tampered = create(TransferProposalRequestSchema, {
      common: create(CommonSatpSchema, { sessionId: "tampered-session" }),
    });
    // sanity: the two messages serialize differently
    expect(
      Array.from(toBinary(TransferProposalRequestSchema, tampered)),
    ).not.toEqual(Array.from(toBinary(TransferProposalRequestSchema, message)));

    const serverHeader = new Headers();
    serverHeader.set(SATP_SIGNATURE, signed.header.get(SATP_SIGNATURE)!);

    await expect(
      runInterceptor(verification, makeUnaryRequest(tampered, serverHeader)),
    ).rejects.toMatchObject({ code: Code.Unauthenticated });
  });
});
