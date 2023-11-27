import {
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  ICactusPlugin,
  IPluginWebService,
  isIPluginWebService,
} from "@hyperledger/cactus-core-api";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

export async function getOpenApiSpecV1(req: {
  readonly pluginRegistry: PluginRegistry;
  readonly logLevel?: LogLevelDesc;
}): Promise<OpenAPIV3.Document[]> {
  const fnTag = `cactus-cmd-api-server/openapi/get-open-api-spec.ts#getOpenApiSpecV1()`;
  Checks.truthy(req, `${fnTag} req`);
  Checks.truthy(req.pluginRegistry, `${fnTag} req.pluginRegistry`);
  const { pluginRegistry, logLevel = "INFO" } = req;

  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: logLevel,
  });

  const allPlugins = pluginRegistry.getPlugins();

  log.debug("Pulled a total of %o plugins from registry.", allPlugins.length);

  const webSvcPlugins = allPlugins.filter((p) => isIPluginWebService(p));

  log.debug("Found %o web service plugins.", webSvcPlugins.length);

  const openApiJsonSpecsPromises = webSvcPlugins.map(
    async (plugin: ICactusPlugin) => {
      const pkgName = plugin.getPackageName();
      log.debug("Getting OpenAPI spec for %s", pkgName);
      const webPlugin = plugin as IPluginWebService;
      const openApiSpec = await webPlugin.getOpenApiSpec();
      return openApiSpec as OpenAPIV3.Document;
    },
  );

  const openApiJsonSpecs = await Promise.all(openApiJsonSpecsPromises);
  return openApiJsonSpecs;
}
