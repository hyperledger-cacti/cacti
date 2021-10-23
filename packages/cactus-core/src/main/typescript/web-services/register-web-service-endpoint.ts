import expressJwtAuthz from "express-jwt-authz";
import { Express } from "express";

import { IWebServiceEndpoint } from "@hyperledger/cactus-core-api";

/**
 * Hooks up an endpoint instance to an ExpressJS web app object.
 *
 * @param webApp The ExpressJS application object that `endpoint` will be registered with.
 * @param endpoint The `IWebServiceEndpoint` instance that will be registered.
 */
export async function registerWebServiceEndpoint(
  webApp: Express,
  endpoint: IWebServiceEndpoint,
): Promise<void> {
  const fnTag = "registerWebServiceEndpoint";
  const httpVerb = endpoint.getVerbLowerCase();
  const httpPath = endpoint.getPath();
  const requestHandler = endpoint.getExpressRequestHandler();

  const provider = endpoint.getAuthorizationOptionsProvider();
  const { isProtected, requiredRoles } = await provider.get();

  const webAppCasted = (webApp as unknown) as Record<
    string,
    (...a: unknown[]) => unknown
  >;

  const registrationMethod = webAppCasted[httpVerb].bind(webApp);
  try {
    if (isProtected) {
      const scopeCheckMiddleware = expressJwtAuthz(requiredRoles);
      registrationMethod(httpPath, scopeCheckMiddleware, requestHandler);
    } else {
      registrationMethod(httpPath, requestHandler);
    }
  } catch (ex) {
    throw new Error(
      `${fnTag} Express verb method ${httpVerb} threw ` +
        ` while registering endpoint: ${ex.message}`,
    );
  }
}
