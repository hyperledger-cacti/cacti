import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";
import { PublicKey } from "../../../generated/openapi/typescript-axios/api";
import { createJvmString } from "./create-jvm-string";

export interface ICreateJvmCactiPublicImplKeyOptions {
  readonly publicKey: PublicKey;
}

export function createJvmCactiPublicKeyImpl(
  opts: Readonly<ICreateJvmCactiPublicImplKeyOptions>,
): JvmObject {
  if (!opts) {
    throw new Error("Expected arg1 to be truthy");
  }
  if (!opts.publicKey) {
    throw new Error("Expected arg1.publicKey to be truthy");
  }
  if (!opts.publicKey.algorithm) {
    throw new Error("Expected arg1.publicKey.algorithm to be truthy");
  }
  if (!opts.publicKey.encoded) {
    throw new Error("Expected arg1.publicKey.encoded to be truthy");
  }
  if (!opts.publicKey.format) {
    throw new Error("Expected arg1.publicKey.format to be truthy");
  }

  return {
    jvmTypeKind: JvmTypeKind.Reference,
    jvmType: {
      fqClassName:
        "org.hyperledger.cactus.plugin.ledger.connector.corda.server.impl.PublicKeyImpl",
    },

    jvmCtorArgs: [
      createJvmString({ data: opts.publicKey.algorithm }),
      createJvmString({ data: opts.publicKey.format }),
      createJvmString({ data: opts.publicKey.encoded }),
    ],
  };
}
