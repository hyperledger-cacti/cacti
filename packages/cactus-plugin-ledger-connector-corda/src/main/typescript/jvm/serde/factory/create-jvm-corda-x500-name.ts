import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";
import { createJvmString } from "./create-jvm-string";

export interface ICreateJvmCordaX500NameOptions {
  readonly commonName?: string;
  readonly organisationUnit?: string;
  readonly organisation: string;
  readonly locality: string;
  readonly state?: string;
  readonly country: string;
}

export function createJvmCordaX500Name(
  opts: Readonly<ICreateJvmCordaX500NameOptions>,
): JvmObject {
  if (!opts) {
    throw new Error("Expected arg1 to be truthy");
  }
  return {
    jvmTypeKind: JvmTypeKind.Reference,
    jvmType: {
      fqClassName: "net.corda.core.identity.CordaX500Name",
    },

    jvmCtorArgs: [
      createJvmString({ data: opts.organisation }),
      createJvmString({ data: opts.locality }),
      createJvmString({ data: opts.country }),
    ],
  };
}
