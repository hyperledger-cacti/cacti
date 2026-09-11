import "reflect-metadata";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import {
  type Address,
  CurrentDrafts,
  type DraftVersions,
  GatewayCredential,
  type GatewayIdentity,
  SupportedSigningAlgorithms,
} from "../../../core/types";
import { NetworkId } from "../../../public-api";
import { Logger } from "@hyperledger-cacti/cactus-common";
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  validateSync,
} from "class-validator";
import { Type, plainToInstance } from "class-transformer";

// Type guard for Address
function isAddress(input: unknown): input is Address {
  if (typeof input !== "string") {
    return false;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return true;
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(input)) {
    const octets = input.split(".").map(Number);
    return octets.every((octet) => octet >= 0 && octet <= 255);
  }
  return false;
}

// Type guard for DraftVersions
function isDraftVersions(obj: unknown): obj is DraftVersions {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return Object.values(CurrentDrafts).every(
    (draft) => typeof objRecord[draft] === "string",
  );
}

// Type guard for an array of DraftVersions
function isPrivacyDraftVersionsArray(
  input: unknown,
): input is Array<DraftVersions> {
  return Array.isArray(input) && input.every(isDraftVersions);
}

// Type guard for NetworkId
export function isNetworkId(obj: unknown, log: Logger): obj is NetworkId {
  try {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "ledgerType" in obj &&
      "id" in obj &&
      typeof obj.id === "string" &&
      Object.values(LedgerType).includes(obj.ledgerType as LedgerType)
    );
  } catch (error) {
    log.error(`NetworkId Error: ${error}`);
    return false;
  }
}

export function isSupportedDLT(obj: unknown): obj is LedgerType {
  try {
    return Object.values(LedgerType).includes(obj as LedgerType);
  } catch (error) {
    return false;
  }
}

// Type guard for an array of NetworkId
function isNetworkIdArray(
  input: unknown,
  log: Logger,
): input is Array<NetworkId> {
  return Array.isArray(input) && input.every((item) => isNetworkId(item, log));
}

// Type guard for GatewayIdentity
export function isGatewayIdentity(
  obj: unknown,
  log: Logger,
): obj is GatewayIdentity {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    typeof (obj as Record<string, unknown>).id === "string" &&
    "version" in obj &&
    isPrivacyDraftVersionsArray((obj as Record<string, unknown>).version) &&
    (!("connectedDLTs" in obj) ||
      isNetworkIdArray((obj as Record<string, unknown>).connectedDLTs, log)) &&
    (!("credentials" in obj) ||
      isGatewayCredentials((obj as Record<string, unknown>).credentials)) &&
    (!("name" in obj) ||
      typeof (obj as Record<string, unknown>).name === "string") &&
    (!("proofID" in obj) ||
      typeof (obj as Record<string, unknown>).proofID === "string") &&
    (!("gatewayServerPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayServerPort === "number") &&
    (!("gatewayClientPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayClientPort === "number") &&
    (!("gatewayOapiPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayOapiPort === "number") &&
    (!("gatewayUIPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayUIPort === "number") &&
    (!("address" in obj) || isAddress((obj as Record<string, unknown>).address))
  );
}

/**
 * Decorated credential classes for the v13 classified gateway credential
 * set. Each `GatewayCredential` purpose has its own class whose decorators
 * declare the required key-material format:
 * - {@link EnvelopeSignatureCredential}: `publicKey` MUST be a JWK object
 *   (imported via WebCrypto `importKey("jwk", ...)`); string material would
 *   fail at runtime. The algorithm MUST be `ES256` — the only algorithm
 *   `signing-keys.ts` implements for the JWS envelope.
 * - {@link ClaimSignatureCredential}: `publicKey` MUST be a non-empty hex
 *   string (consumed by the secp256k1 claim signature verifier). The
 *   algorithm MUST be `SECP256K1`.
 * - Other purposes accept either form ({@link GenericGatewayCredential}).
 */
abstract class GatewayCredentialBase {
  @IsEnum(GatewayCredential)
  purpose!: GatewayCredential;

  @IsEnum(SupportedSigningAlgorithms)
  algorithm!: SupportedSigningAlgorithms;
}

export class EnvelopeSignatureCredential extends GatewayCredentialBase {
  @IsObject()
  publicKey!: Record<string, unknown>;
}

export class ClaimSignatureCredential extends GatewayCredentialBase {
  @IsString()
  @IsNotEmpty()
  publicKey!: string;
}

export class GenericGatewayCredential extends GatewayCredentialBase {
  @IsNotEmpty()
  publicKey!: string | Record<string, unknown>;
}

/**
 * Decorated view of the `credentials` record: one optional, nested-validated
 * entry per {@link GatewayCredential} purpose.
 */
class GatewayCredentialsRecord {
  @IsOptional()
  @ValidateNested()
  @Type(() => EnvelopeSignatureCredential)
  [GatewayCredential.ENVELOPE_SIGNATURE]?: EnvelopeSignatureCredential;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClaimSignatureCredential)
  [GatewayCredential.CLAIM_SIGNATURE]?: ClaimSignatureCredential;

  @IsOptional()
  @ValidateNested()
  @Type(() => GenericGatewayCredential)
  [GatewayCredential.SECURE_CHANNEL]?: GenericGatewayCredential;

  @IsOptional()
  @ValidateNested()
  @Type(() => GenericGatewayCredential)
  [GatewayCredential.IDENTITY]?: GenericGatewayCredential;

  @IsOptional()
  @ValidateNested()
  @Type(() => GenericGatewayCredential)
  [GatewayCredential.OWNER_IDENTITY]?: GenericGatewayCredential;
}

/**
 * Algorithms each {@link GatewayCredential} purpose is compatible with.
 *
 * Key shape alone is not enough: the runtime consumers of each credential
 * only implement one algorithm family. An `ENVELOPE_SIGNATURE` credential
 * is always imported and used as ES256 (P-256) by `signing-keys.ts`, and a
 * `CLAIM_SIGNATURE` credential is verified with the secp256k1
 * `JsObjectSigner`. A credential advertising a different algorithm would
 * disagree with the wire behavior, so validation fails closed.
 */
const PURPOSE_ALGORITHMS: Record<
  GatewayCredential,
  SupportedSigningAlgorithms[]
> = {
  [GatewayCredential.ENVELOPE_SIGNATURE]: [SupportedSigningAlgorithms.ES256],
  [GatewayCredential.CLAIM_SIGNATURE]: [SupportedSigningAlgorithms.SECP256K1],
  [GatewayCredential.SECURE_CHANNEL]: Object.values(SupportedSigningAlgorithms),
  [GatewayCredential.IDENTITY]: Object.values(SupportedSigningAlgorithms),
  [GatewayCredential.OWNER_IDENTITY]: Object.values(SupportedSigningAlgorithms),
};

/**
 * Type guard for the v13 classified gateway credential set. Delegates to
 * the decorated credential classes above: unknown purposes are ignored,
 * absent entries are allowed, and each present entry is validated against
 * its purpose-specific material format and algorithm compatibility.
 */
function isGatewayCredentials(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return false;
  }
  const instance = plainToInstance(GatewayCredentialsRecord, obj);
  if (validateSync(instance, { skipMissingProperties: true }).length !== 0) {
    return false;
  }
  const record = obj as Record<string, { algorithm?: unknown } | undefined>;
  for (const [purpose, credential] of Object.entries(record)) {
    const allowed = PURPOSE_ALGORITHMS[purpose as GatewayCredential];
    if (allowed === undefined) {
      continue; // unknown purposes are ignored (validated as generic)
    }
    if (
      !allowed.includes(credential?.algorithm as SupportedSigningAlgorithms)
    ) {
      return false;
    }
  }
  return true;
}

export function validateSatpGatewayIdentity(
  opts: {
    readonly configValue: unknown;
  },
  log: Logger,
): GatewayIdentity {
  if (
    !opts ||
    !opts.configValue ||
    typeof opts.configValue !== "object" ||
    !isGatewayIdentity(opts.configValue, log)
  ) {
    throw new TypeError(
      `Invalid config.gid: ${JSON.stringify(opts.configValue)}`,
    );
  }
  return opts.configValue;
}
