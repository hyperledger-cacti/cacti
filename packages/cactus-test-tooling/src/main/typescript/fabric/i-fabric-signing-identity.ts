/**
 * ## FIXME(peter):
 * This is a duplicate of the same interface defined in the
 * fabric connector plugin because it is needed in both packages but the two
 * packages cannot depend on each other to avoid cycles.
 * One solution is to make the test ledger's method that returns this generic
 * and another is to put the interface definition in a common-like package
 * such as the common package or the core-api package maybe. Couldn't come up with
 * a suitable location so for now just placed the interface in both places.
 * see the other one at `packages/cactus-plugin-ledger-connector-fabric/src/main/typescript/i-fabric-signing-identity.ts`
 */
export interface ISigningIdentity {
  privateKeyPem: string;
  certificate: string;
  mspId: string;
}
