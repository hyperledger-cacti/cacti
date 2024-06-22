import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { Party } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";
import { createJvmCactiPublicKeyImpl } from "./create-jvm-cacti-public-key-impl";
import { createJvmCordaX500Name } from "./create-jvm-corda-x500-name";

export interface ICreateJvmCordaIdentityPartyOptions {
  readonly party: Readonly<Party>;
}

export function createJvmCordaIdentityParty(
  opts: Readonly<ICreateJvmCordaIdentityPartyOptions>,
): JvmObject {
  return {
    jvmTypeKind: JvmTypeKind.Reference,
    jvmType: {
      fqClassName: "net.corda.core.identity.Party",
    },

    jvmCtorArgs: [
      createJvmCordaX500Name({
        country: opts.party.name.country,
        locality: opts.party.name.locality,
        organisation: opts.party.name.organisation,
      }),
      createJvmCactiPublicKeyImpl({ publicKey: opts.party.owningKey }),
    ],
  };
}
