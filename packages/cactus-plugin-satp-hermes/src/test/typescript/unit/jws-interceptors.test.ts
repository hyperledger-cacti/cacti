import { create, toBinary } from "@bufbuild/protobuf";
import { Code, ConnectError } from "@connectrpc/connect";
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
  let signing: Interceptor;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateSigningKeyPair();
    const encoder = new TextEncoder();
    const testPayload = encoder.encode("test payload");
    priv = await importSigningKey(privateKey);
    pub = await importSigningKey(publicKey);
    signing = createSignatureSigningInterceptor({
      getPrivateKey: async () => priv,
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

  it("rejects when the signer's public key is unknown", async () => {
    const message = create(TransferProposalRequestSchema, {});
    const signed = await runInterceptor(signing, makeUnaryRequest(message));

    const verification = createSignatureVerificationInterceptor({
      resolvePublicKey: async () => undefined,
    });
    const serverHeader = new Headers();
    serverHeader.set(SATP_SIGNATURE, signed.header.get(SATP_SIGNATURE)!);

    await expect(
      runInterceptor(verification, makeUnaryRequest(message, serverHeader)),
    ).rejects.toBeInstanceOf(ConnectError);
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
