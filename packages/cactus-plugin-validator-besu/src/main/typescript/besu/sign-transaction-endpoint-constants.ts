/**
 * FIXME: Once we have the build based on Webpack 5 with the dynamic dependencies
 * feature enabled these static variables can be moved back to the
 * corresponding Typescript  file and this current one can be
 * deleted altogether. Until then, this workaround is necessary which makes the
 * code more verbose than it should be. - Peter
 */
export class BesuSignTransactionEndpointV1 {
  public static readonly HTTP_PATH: string =
    "/api/v1/plugins/@hyperledger/cactus-plugin-validator-besu/sign-transaction";

  public static readonly HTTP_VERB_LOWER_CASE: string = "post";

  public static readonly OPENAPI_OPERATION_ID: string = "besuSignTransactionV1";
}
