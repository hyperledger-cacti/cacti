/**
 * Add application path to route path where applicable.
 *
 * Example: "blocks" route under "eth" app will create a path /eth/blocks
 */
export function patchAppRoutePath(appPath: string, routePath?: string) {
  // Add missing '/' to front of app path if necessary
  appPath = appPath.startsWith("/") ? appPath : `/${appPath}`;

  if (routePath && routePath !== "/") {
    // Remove additionall '/' from route to create nice concat
    routePath = routePath.startsWith("/") ? routePath.slice(1) : routePath;
    return `${appPath}/${routePath}`;
  } else {
    return appPath;
  }
}

/**
 * Returns true if provided url is defined and valid, returns false and
 * writes error to `console.error` otherwise.
 */
export function isValidUrl(urlString?: string) {
  if (!urlString) {
    return false;
  }

  try {
    new URL(urlString);
    return true;
  } catch (e) {
    console.error(`Invalid URL provided: ${urlString}, error: ${e}`);
    return false;
  }
}
