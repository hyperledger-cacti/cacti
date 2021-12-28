import { SecureVersion } from "tls";
import { existsSync, readFileSync } from "fs";
import convict, { Schema, Config, SchemaObj } from "convict";
import { ipaddress } from "convict-format-with-validator";
import { v4 as uuidV4 } from "uuid";
import {
  generateKeyPair,
  exportPKCS8,
  exportSPKI,
  importPKCS8,
  GeneralSign,
  generalVerify,
} from "jose";
import type { Options as ExpressJwtOptions } from "express-jwt";
import jsonStableStringify from "json-stable-stringify";
import {
  LoggerProvider,
  Logger,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import {
  ConsortiumDatabase,
  Constants,
  PluginImport,
  PluginImportType,
  PluginImportAction,
} from "@hyperledger/cactus-core-api";

import { FORMAT_PLUGIN_ARRAY } from "./convict-plugin-array-format";
import { SelfSignedPkiGenerator, IPki } from "./self-signed-pki-generator";
import { AuthorizationProtocol } from "./authorization-protocol";
import { IAuthorizationConfig } from "../authzn/i-authorization-config";

convict.addFormat(FORMAT_PLUGIN_ARRAY);
convict.addFormat(ipaddress);

export interface ICactusApiServerOptions {
  pluginManagerOptionsJson: string;
  authorizationProtocol: AuthorizationProtocol;
  authorizationConfigJson: IAuthorizationConfig;
  configFile: string;
  cactusNodeId: string;
  consortiumId: string;
  logLevel: LogLevelDesc;
  tlsDefaultMaxVersion: SecureVersion;
  cockpitEnabled: boolean;
  cockpitHost: string;
  cockpitPort: number;
  cockpitCorsDomainCsv: string;
  cockpitApiProxyRejectUnauthorized: boolean;
  cockpitTlsEnabled: boolean;
  cockpitMtlsEnabled: boolean;
  cockpitWwwRoot: string;
  cockpitTlsCertPem: string;
  cockpitTlsKeyPem: string;
  cockpitTlsClientCaPem: string;
  apiHost: string;
  apiPort: number;
  apiCorsDomainCsv: string;
  apiTlsEnabled: boolean;
  apiMtlsEnabled: boolean;
  apiTlsCertPem: string;
  apiTlsKeyPem: string;
  apiTlsClientCaPem: string;
  grpcPort: number;
  grpcMtlsEnabled: boolean;
  plugins: PluginImport[];
  keyPairPem: string;
  keychainSuffixKeyPairPem: string;
  minNodeVersion: string;
  enableShutdownHook: boolean;
}

export class ConfigService {
  private static config: Config<ICactusApiServerOptions>;

  private static readonly HELP_TEXT_HEADER: string =
    `Order of precedent for parameters in descdending order: CLI, Environment variables, Configuration file.\n` +
    `Passing "help" as the first argument prints this message and also dumps the effective configuration.\n\n` +
    `Configuration Parameters\n` +
    `========================\n\n`;

  public static getHelpText(): string {
    const schema: any = ConfigService.getConfigSchema();

    const argsHelpText = Object.keys(schema)
      .map(
        (optionName: string) =>
          `  ${optionName}:` +
          `\n\t\tDescription: ${schema[optionName].doc}` +
          `\n\t\tDefault: ${
            schema[optionName].default ||
            "Mandatory parameter without a default value."
          }` +
          `\n\t\tEnv: ${schema[optionName].env}` +
          `\n\t\tCLI: --${schema[optionName].arg}`,
      )
      .join("\n");

    return this.HELP_TEXT_HEADER.concat(argsHelpText).concat("\n\n");
  }

  private static getConfigSchema(): Schema<ICactusApiServerOptions> {
    return {
      pluginManagerOptionsJson: {
        doc:
          "Can be used to override npm registry and authentication details for example. See https://www.npmjs.com/package/live-plugin-manager#pluginmanagerconstructoroptions-partialpluginmanageroptions for further details.",
        format: "*",
        default: "{}",
        env: "PLUGIN_MANAGER_OPTIONS_JSON",
        arg: "plugin-manager-options-json",
      },
      authorizationProtocol: {
        doc:
          "The name of the authorization protocol to use. Accepted values" +
          `are: ${Object.values(AuthorizationProtocol).join(",")}`,
        format: (value: AuthorizationProtocol) => {
          ConfigService.formatNonBlankString(value);
          const accepted = Object.values(AuthorizationProtocol);
          const acceptedCsv = accepted.join(",");
          if (!accepted.includes(value)) {
            const m = `Accepted auth protocols: ${acceptedCsv} Got: ${value}`;
            throw new Error(m);
          }
        },
        default: (null as unknown) as AuthorizationProtocol,
        env: "AUTHORIZATION_PROTOCOL",
        arg: "authorization-protocol",
      },
      authorizationConfigJson: {
        doc: "The JSON string to deserialize when configuring authorization.",
        default: null as IAuthorizationConfig | null,
        format: Object,
        env: "AUTHORIZATION_CONFIG_JSON",
        arg: "authorization-config-json",
      },
      plugins: {
        doc: "A collection of plugins to load at runtime.",
        format: "plugin-array",
        default: [],
        env: "PLUGINS",
        arg: "plugins",
        pluginSchema: {
          action: {
            format: (value: PluginImportAction) => {
              ConfigService.formatNonBlankString(value);
              const accepted = Object.values(PluginImportAction);
              const acceptedCsv = accepted.join(",");
              if (!accepted.includes(value)) {
                const m = `Accepted plugin import actions: ${acceptedCsv} Got: ${value}`;
                throw new Error(m);
              }
            },
            default: PluginImportAction.Install,
          },
          options: {
            format: Object,
            default: {},
          },
          packageName: "*",
          type: {
            format: (value: PluginImportType) => {
              ConfigService.formatNonBlankString(value);
              const accepted = Object.values(PluginImportType);
              const acceptedCsv = accepted.join(",");
              if (!accepted.includes(value)) {
                const m = `Accepted plugin import types: ${acceptedCsv} Got: ${value}`;
                throw new Error(m);
              }
            },
            default: PluginImportType.Local,
          },
        },
      } as SchemaObj<PluginImport[]>,
      configFile: {
        doc:
          "The path to a config file that holds the configuration itself which will be parsed and validated.",
        format: "*",
        default: "",
        env: "CONFIG_FILE",
        arg: "config-file",
      },
      consortiumId: {
        doc:
          "Identifier of the consortium your node is part of. " +
          " Can be any string of characters such as a UUID",
        format: ConfigService.formatNonBlankString,
        default: null as string | null,
        env: "CONSORTIUM_ID",
        arg: "consortium-id",
      },
      cactusNodeId: {
        doc:
          "Identifier of this particular Cactus node. Must be unique among the total set of Cactus nodes running in any " +
          "given Cactus deployment. Can be any string of characters such as a UUID or an Int64",
        format: ConfigService.formatNonBlankString,
        default: null as string | null,
        env: "CACTUS_NODE_ID",
        arg: "cactus-node-id",
      },
      logLevel: {
        doc:
          "The level at which loggers should be configured. Supported values include the following: " +
          "error, warn, info, debug, trace",
        format: ConfigService.formatNonBlankString,
        default: "warn",
        env: "LOG_LEVEL",
        arg: "log-level",
      },
      minNodeVersion: {
        doc:
          "Determines the lower bound of NodeJS version that the API " +
          "server will be willing to start on. Defaults to v12 because v10 " +
          "does not support TLS v1.3. If you must run on Node 10, just set " +
          "this configuration parameter to 10.0.0 for example.",
        format: ConfigService.formatNonBlankString,
        default: "12.0.0",
        env: "MIN_NODE_VERSION",
        arg: "min-node-version",
      },
      tlsDefaultMaxVersion: {
        doc:
          "Sets the DEFAULT_MAX_VERSION property of the built-in tls module of NodeJS. " +
          "Only makes a difference on NOdeJS 10 and older where TLS v1.3 is turned off by default. " +
          "Newer NodeJS versions ship with TLS v1.3 enabled.",
        format: (version: string) => {
          ConfigService.formatNonBlankString(version);
          const versions = ["TLSv1.3", "TLSv1.2", "TLSv1.1", "TLSv1"];
          if (!versions.includes(version)) {
            const msg = `OK TLS versions ${versions.join(",")} Got: ${version}`;
            throw new Error(msg);
          }
        },
        default: "TLSv1.3",
        env: "TLS_DEFAULT_MAX_VERSION",
        arg: "tls-default-max-version",
      },
      cockpitEnabled: {
        doc: "Enable Cockpit server.",
        format: Boolean,
        env: "COCKPIT_ENABLED",
        arg: "cockpit-enabled",
        default: false,
      },
      cockpitHost: {
        doc:
          "The host to bind the Cockpit webserver to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.",
        format: "ipaddress",
        default: "127.0.0.1",
        env: "COCKPIT_HOST",
        arg: "cockpit-host",
      },
      cockpitPort: {
        doc: "The HTTP port to bind the Cockpit webserver to.",
        format: "port",
        env: "COCKPIT_PORT",
        arg: "cockpit-port",
        default: 3000,
      },
      cockpitWwwRoot: {
        doc:
          "The file-system path pointing to the static files of web application served as the cockpit by the API server.",
        format: "*",
        env: "COCKPIT_WWW_ROOT",
        arg: "cockpit-www-root",
        default:
          "packages/cactus-cmd-api-server/node_modules/@hyperledger/cactus-cockpit/www/",
      },
      cockpitCorsDomainCsv: {
        doc:
          "The Comma seperated list of domains to allow Cross Origin Resource Sharing from when " +
          "serving static file requests. The wildcard (*) character is supported to allow CORS for any and all domains",
        format: "*",
        env: "COCKPIT_CORS_DOMAIN_CSV",
        arg: "cockpit-cors-domain-csv",
        default: "",
      },
      cockpitTlsEnabled: {
        doc:
          "Enable TLS termination on the server. Useful if you do not have/want to " +
          "have a reverse proxy or load balancer doing the SSL/TLS termination in your environment.",
        format: Boolean,
        env: "COCKPIT_TLS_ENABLED",
        arg: "cockpit-tls-enabled",
        default: true,
      },
      cockpitApiProxyRejectUnauthorized: {
        doc:
          "When false: accept self signed certificates while proxying from the cockpit host " +
          "to the API host. Acceptable for development environments, never use it in production.",
        format: Boolean,
        env: "COCKPIT_API_PROXY_REJECT_UNAUTHORIZED",
        arg: "cockpit-api-proxy-reject-unauthorized",
        default: true,
      },
      cockpitMtlsEnabled: {
        doc:
          "Enable mTLS so that only clients presenting valid TLS certificate of " +
          "their own will be able to connect to the cockpit",
        format: Boolean,
        env: "COCKPIT_MTLS_ENABLED",
        arg: "cockpit-mtls-enabled",
        default: true,
      },
      cockpitTlsCertPem: {
        doc:
          "Either the file path to the cert file or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "COCKPIT_TLS_CERT_PEM",
        arg: "cockpit-tls-cert-pem",
        default: null as string | null,
      },
      cockpitTlsKeyPem: {
        sensitive: true,
        doc:
          "Either the file path to the key file or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "COCKPIT_TLS_KEY_PEM",
        arg: "cockpit-tls-key-pem",
        default: null as string | null,
      },
      cockpitTlsClientCaPem: {
        doc:
          "Either the client cert file pat or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "COCKPIT_TLS_CLIENT_CA_PEM",
        arg: "cockpit-tls-client-ca-pem",
        default: null as string | null,
      },
      apiHost: {
        doc:
          "The host to bind the API to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.",
        format: "ipaddress",
        env: "API_HOST",
        arg: "api-host",
        default: "127.0.0.1",
      },
      apiPort: {
        doc: "The HTTP port to bind the API server endpoints to.",
        format: "port",
        env: "API_PORT",
        arg: "api-port",
        default: 4000,
      },
      apiCorsDomainCsv: {
        doc:
          "The Comma seperated list of domains to allow Cross Origin Resource Sharing from when " +
          "serving API requests. The wildcard (*) character is supported to allow CORS for any and all domains, " +
          "however using it is not recommended unless you are developing or demonstrating something with Cactus.",
        format: "*",
        env: "API_CORS_DOMAIN_CSV",
        arg: "api-cors-domain-csv",
        default: "",
      },
      apiTlsEnabled: {
        doc:
          "Enable TLS termination on the server. Useful if you do not have/want to " +
          "have a reverse proxy or load balancer doing the SSL/TLS termination in your environment.",
        format: Boolean,
        env: "API_TLS_ENABLED",
        arg: "api-tls-enabled",
        default: true,
      },
      apiMtlsEnabled: {
        doc:
          "Enable mTLS so that only clients presenting valid TLS certificate of " +
          "their own will be able to connect to the web APIs",
        format: Boolean,
        env: "API_MTLS_ENABLED",
        arg: "api-mtls-enabled",
        default: true,
      },
      apiTlsCertPem: {
        doc:
          "Either the file path to the cert file or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "API_TLS_CERT_PEM",
        arg: "api-tls-cert-pem",
        default: null as string | null,
      },
      apiTlsClientCaPem: {
        doc:
          "Either the client cert file pat or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "API_TLS_CLIENT_CA_PEM",
        arg: "api-tls-client-ca-pem",
        default: null as string | null,
      },
      apiTlsKeyPem: {
        sensitive: true,
        doc:
          "Either the file path to the key file or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "API_TLS_KEY_PEM",
        arg: "api-tls-key-pem",
        default: null as string | null,
      },
      grpcPort: {
        doc: "The gRPC port to serve web services on.",
        format: "port",
        env: "GRPC_PORT",
        arg: "grpc-port",
        default: 5000,
      },
      grpcMtlsEnabled: {
        doc:
          "Enable TLS termination on the grpc server. Useful if you do not have/want to " +
          "have a reverse proxy or load balancer doing the SSL/TLS termination in your environment.",
        format: Boolean,
        env: "GRPC_TLS_ENABLED",
        arg: "grpc-tls-enabled",
        default: true,
      },
      keyPairPem: {
        sensitive: true,
        doc:
          "Key pair (private+public) of this Cactus node in the standard " +
          " PEM format.",
        env: "KEY_PAIR_PEM",
        arg: "key-pair-pem",
        format: ConfigService.formatNonBlankString,
        default: null as string | null,
      },
      keychainSuffixKeyPairPem: {
        doc:
          "The key under which to store/retrieve the key pair PEM from the " +
          " keychain of this Cactus node (API server) The complete lookup key" +
          " is constructed from the ${CACTUS_NODE_ID}" +
          "${KEYCHAIN_SUFFIX_KEY_PAIR_PEM} template.",
        env: "KEYCHAIN_SUFFIX_KEY_PAIR_PEM",
        arg: "keychain-suffix-key-pair-pem",
        format: "*",
        default: "CACTUS_NODE_KEY_PAIR_PEM",
      },
      enableShutdownHook: {
        doc:
          "It will cause the API server to listen to OS process signals and will attempt " +
          "to gracefully shut itself down in response to these when the flag is enabled " +
          "(which is the default behavior). You will want to turn this off if you are embedding " +
          "the API server in your own application and would like to stop the API server from " +
          "meddling in the OS process signal handling when you take care of it yourself in your own code.",
        env: "ENABLE_SHUTDOWN_HOOK",
        arg: "enable-shutdown-hook",
        format: Boolean,
        default: true,
      },
    };
  }

  private static formatNonBlankString(value: unknown) {
    if (typeof value === "undefined" || value === null || value === "") {
      throw new Error("must be a non-empty string");
    }
  }

  private static filePathOrFileContents(value: string) {
    ConfigService.formatNonBlankString(value);
    if (existsSync(value)) {
      return readFileSync(value);
    } else {
      return value;
    }
  }

  /**
   * Remaps the example config returned by `newExampleConfig()` into a similar object whose keys are the designated
   * environment variable names. As an example it returns something like this:
   *
   * ```json
   * {
   *   "HTTP_PORT": "3000"
   * }
   * ```
   *
   * Where the output of `newExampleConfig()` would be something like this (example)
   *
   * ```json
   * {
   *   "httpPort": "3000"
   * }
   * ```
   */
  public async newExampleConfigEnv(
    cactusApiServerOptions?: ICactusApiServerOptions,
  ): Promise<{ [key: string]: string }> {
    cactusApiServerOptions =
      cactusApiServerOptions || (await this.newExampleConfig());
    const configSchema: any = ConfigService.getConfigSchema();
    return Object.entries(cactusApiServerOptions).reduce(
      (acc: any, [key, value]) => {
        const schemaObj: any = configSchema[key];
        acc[schemaObj.env] = value;
        return acc;
      },
      {},
    );
  }

  public async newExampleConfigConvict(
    cactusApiServerOptions?: ICactusApiServerOptions,
    overrides?: boolean,
  ): Promise<Config<ICactusApiServerOptions>> {
    cactusApiServerOptions =
      cactusApiServerOptions || (await this.newExampleConfig());
    const env = await this.newExampleConfigEnv(cactusApiServerOptions);
    const conf = overrides ? this.create({ env }) : this.getOrCreate({ env });
    return conf;
  }

  public async newExampleConfig(): Promise<ICactusApiServerOptions> {
    const schema = ConfigService.getConfigSchema();

    const apiTlsEnabled: boolean = (schema.apiTlsEnabled as SchemaObj).default;
    const apiHost = (schema.apiHost as SchemaObj).default;
    const apiPort = (schema.apiPort as SchemaObj).default;
    const apiProtocol = apiTlsEnabled ? "https:" : "http";
    const apiBaseUrl = `${apiProtocol}//${apiHost}:${apiPort}`;
    const grpcPort = (schema.grpcPort as SchemaObj).default;
    const grpcMtlsEnabled = (schema.grpcMtlsEnabled as SchemaObj).default;
    const enableShutdownHook = (schema.enableShutdownHook as SchemaObj).default;

    const keyPair = await generateKeyPair("ES256K");
    const keyPairPem = await exportPKCS8(keyPair.privateKey);
    const publicKeyPem = await exportSPKI(keyPair.publicKey);
    const memberId1 = "Cactus_Example_Consortium_Member_1";
    const nodeId1 = "Cactus_Example_Consortium_Node_1";
    const consortiumDatabase: ConsortiumDatabase = {
      cactusNode: [
        {
          consortiumId: "Cactus_Example_Consortium",
          id: nodeId1,
          ledgerIds: [],
          memberId: memberId1,
          pluginInstanceIds: [],
          nodeApiHost: apiBaseUrl,
          publicKeyPem: publicKeyPem,
        },
      ],
      consortiumMember: [
        {
          id: memberId1,
          name: "Example Cactus Consortium Member 1",
          nodeIds: [nodeId1],
        },
      ],
      ledger: [],
      pluginInstance: [],
      consortium: [
        {
          name: "Example Cactus Consortium",
          id: uuidV4(),
          mainApiHost: apiBaseUrl,
          memberIds: [memberId1],
        },
      ],
    };

    const cockpitTlsEnabled = (schema.cockpitTlsEnabled as SchemaObj).default;
    const cockpitHost = (schema.cockpitHost as SchemaObj).default;
    const cockpitPort = (schema.cockpitPort as SchemaObj).default;

    const pkiGenerator = new SelfSignedPkiGenerator();
    const pkiServer: IPki = pkiGenerator.create("localhost");

    const plugins: PluginImport[] = [
      {
        packageName: "@hyperledger/cactus-plugin-keychain-memory",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: uuidV4(),
          keychainId: uuidV4(),
        },
      },
      {
        packageName: "@hyperledger/cactus-plugin-consortium-manual",
        type: PluginImportType.Local,
        action: PluginImportAction.Install,
        options: {
          instanceId: uuidV4(),
          keyPairPem,
          consortiumDatabase,
        },
      },
    ];

    const jwtSecret = uuidV4();

    const expressJwtOptions: ExpressJwtOptions = {
      secret: jwtSecret,
      algorithms: ["RS256"],
      audience: "org.hyperledger.cactus.jwt.audience",
      issuer: "org.hyperledger.cactus.jwt.issuer",
    };

    const authorizationConfigJson: IAuthorizationConfig = {
      socketIoPath: Constants.SocketIoConnectionPathV1,
      unprotectedEndpointExemptions: [],
      socketIoJwtOptions: {
        secret: jwtSecret,
      },
      expressJwtOptions,
    };

    return {
      pluginManagerOptionsJson: "{}",
      authorizationProtocol: AuthorizationProtocol.JSON_WEB_TOKEN,
      authorizationConfigJson,
      configFile: ".config.json",
      cactusNodeId: uuidV4(),
      consortiumId: uuidV4(),
      logLevel: "debug",
      minNodeVersion: (schema.minNodeVersion as SchemaObj).default,
      tlsDefaultMaxVersion: "TLSv1.3",
      apiHost,
      apiPort,
      apiCorsDomainCsv: (schema.apiCorsDomainCsv as SchemaObj).default,
      apiMtlsEnabled: false,
      cockpitApiProxyRejectUnauthorized: true,
      apiTlsEnabled,
      apiTlsCertPem: pkiServer.certificatePem,
      apiTlsKeyPem: pkiServer.privateKeyPem,
      apiTlsClientCaPem: "-", // API mTLS is off so this will not crash the server
      grpcPort,
      grpcMtlsEnabled,
      cockpitEnabled: (schema.cockpitEnabled as SchemaObj).default,
      cockpitHost,
      cockpitPort,
      cockpitWwwRoot: (schema.cockpitWwwRoot as SchemaObj).default,
      cockpitCorsDomainCsv: (schema.cockpitCorsDomainCsv as SchemaObj).default,
      cockpitMtlsEnabled: false,
      cockpitTlsEnabled,
      cockpitTlsCertPem: pkiServer.certificatePem,
      cockpitTlsKeyPem: pkiServer.privateKeyPem,
      cockpitTlsClientCaPem: "-", // Cockpit mTLS is off so this will not crash the server
      keyPairPem,
      keychainSuffixKeyPairPem: (schema.keychainSuffixKeyPairPem as SchemaObj)
        .default,
      plugins,
      enableShutdownHook,
    };
  }

  async getOrCreate(options?: {
    env?: NodeJS.ProcessEnv;
    args?: string[];
  }): Promise<Config<ICactusApiServerOptions>> {
    if (!ConfigService.config) {
      this.create(options);
    }
    return ConfigService.config;
  }

  create(options?: {
    env?: NodeJS.ProcessEnv;
    args?: string[];
  }): Config<ICactusApiServerOptions> {
    const schema: Schema<ICactusApiServerOptions> = ConfigService.getConfigSchema();
    ConfigService.config = (convict as any)(schema, options);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (ConfigService.config.get("configFile")) {
      const configFilePath = ConfigService.config.get("configFile");
      ConfigService.config.loadFile(configFilePath);
    }
    ConfigService.config.validate();
    // this validation fails with supply-chain default configuration
    // and it will be removed
    // this.validateKeyPairMatch();
    const level = ConfigService.config.get("logLevel");
    const logger: Logger = LoggerProvider.getOrCreate({
      label: "config-service",
      level,
    });
    logger.info("Configuration validation OK.");
    return ConfigService.config;
  }

  /**
   * Validation that prevents operators from mistakenly deploying a key pair
   * that they may not be operational for whatever reason.
   *
   * @throws If a dummy sign+verification operation fails for any reason.
   */
  async validateKeyPairMatch(): Promise<void> {
    const fnTag = "ConfigService#validateKeyPairMatch()";
    // FIXME most of this lowever level crypto code should be in a commons package that's universal
    const keyPairPem = ConfigService.config.get("keyPairPem");
    const keyPair = await importPKCS8(keyPairPem, "ES256K");

    const payloadJson = jsonStableStringify({ hello: "world" });
    const encoder = new TextEncoder();
    const sign = new GeneralSign(encoder.encode(payloadJson));
    sign.addSignature(keyPair).setProtectedHeader({ alg: "ES256K" });
    const jws = await sign.sign();

    try {
      await generalVerify(jws, keyPair);
    } catch (ex) {
      throw new Error(`${fnTag} Invalid key pair PEM: ${ex && ex.stack}`);
    }
  }
}
