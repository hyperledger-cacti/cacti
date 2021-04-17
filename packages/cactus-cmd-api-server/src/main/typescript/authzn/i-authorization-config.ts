export interface IAuthorizationConfig {
  middlewareOptions: Record<string, unknown>;
  unprotectedEndpointExemptions: Array<string>;
}
