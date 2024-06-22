import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";
import { createJvmString } from "./create-jvm-string";

export interface ICreateJvmCordaUniqueIdentifierOptions {
  readonly uniqueidentifier: Readonly<string>;
}

export function createJvmCordaUniqueIdentifier(
  opts: Readonly<ICreateJvmCordaUniqueIdentifierOptions>,
): JvmObject {
  if (!opts) {
    throw new Error("Expected arg1 to be truthy");
  }
  if (!opts.uniqueidentifier) {
    throw new Error("Expected arg1.uniqueidentifier to be truthy");
  }
  return {
    jvmTypeKind: JvmTypeKind.Reference,
    jvmType: {
      fqClassName: "net.corda.core.contracts.UniqueIdentifier",
    },

    jvmCtorArgs: [createJvmString({ data: opts.uniqueidentifier })],
  };
}
