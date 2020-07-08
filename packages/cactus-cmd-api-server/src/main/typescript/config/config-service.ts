import { randomBytes } from "crypto";
import { SecureVersion } from "tls";
import { existsSync, readFileSync } from "fs";
import convict, { Schema, Config, SchemaObj } from "convict";
import { ipaddress } from "convict-format-with-validator";
import secp256k1 from "secp256k1";
import { v4 as uuidV4 } from "uuid";
import {
  LoggerProvider,
  Logger,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { FORMAT_PLUGIN_ARRAY } from "./convict-plugin-array-format";
import { SelfSignedPkiGenerator, IPki } from "./self-signed-pki-generator";

convict.addFormat(FORMAT_PLUGIN_ARRAY);
convict.addFormat(ipaddress);

export interface IPluginImport {
  packageName: string;
  options?: any;
}

export interface ICactusApiServerOptions {
  configFile: string;
  cactusNodeId: string;
  logLevel: LogLevelDesc;
  tlsDefaultMaxVersion: SecureVersion;
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
  plugins: IPluginImport[];
  publicKey: string;
  privateKey: string;
  keychainSuffixPublicKey: string;
  keychainSuffixPrivateKey: string;
  minNodeVersion: string;
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
      .map((optionName: string) => {
        return (
          `  ${optionName}:` +
          `\n\t\tDescription: ${schema[optionName].doc}` +
          `\n\t\tDefault: ${
            schema[optionName].default ||
            "Mandatory parameter without a default value."
          }` +
          `\n\t\tEnv: ${schema[optionName].env}` +
          `\n\t\tCLI: --${schema[optionName].arg}`
        );
      })
      .join("\n");

    return this.HELP_TEXT_HEADER.concat(argsHelpText).concat("\n\n");
  }

  private static getConfigSchema(): Schema<ICactusApiServerOptions> {
    return {
      plugins: {
        doc: "A collection of plugins to load at runtime.",
        format: "plugin-array",
        default: [],
        env: "PLUGINS",
        arg: "plugins",
        pluginSchema: {
          packageName: "*",
          options: {
            format: Object,
            default: {},
          },
        },
      } as any,
      configFile: {
        doc:
          "The path to a config file that holds the configuration itself which will be parsed and validated.",
        format: "*",
        default: "",
        env: "CONFIG_FILE",
        arg: "config-file",
      },
      cactusNodeId: {
        doc:
          "Identifier of this particular Cactus node. Must be unique among the total set of Cactus nodes running in any " +
          "given Cactus deployment. Can be any string of characters such as a UUID or an Int64",
        format: ConfigService.formatNonBlankString,
        default: null as any,
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
        default: null as any,
      },
      cockpitTlsKeyPem: {
        sensitive: true,
        doc:
          "Either the file path to the key file or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "COCKPIT_TLS_KEY_PEM",
        arg: "cockpit-tls-key-pem",
        default: null as any,
      },
      cockpitTlsClientCaPem: {
        doc:
          "Either the client cert file pat or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "COCKPIT_TLS_CLIENT_CA_PEM",
        arg: "cockpit-tls-client-ca-pem",
        default: null as any,
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
        default: null as any,
      },
      apiTlsClientCaPem: {
        doc:
          "Either the client cert file pat or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "API_TLS_CLIENT_CA_PEM",
        arg: "api-tls-client-ca-pem",
        default: null as any,
      },
      apiTlsKeyPem: {
        sensitive: true,
        doc:
          "Either the file path to the key file or the contents of it. Value is checked for existence on the file " +
          "system as a path. If the latter comes back negative then value is assumed to be the actual pem string.",
        format: ConfigService.filePathOrFileContents,
        env: "API_TLS_KEY_PEM",
        arg: "api-tls-key-pem",
        default: null as any,
      },
      publicKey: {
        doc: "Public key of this Cactus node (the API server)",
        env: "PUBLIC_KEY",
        arg: "public-key",
        format: ConfigService.formatNonBlankString,
        default: null as any,
      },
      privateKey: {
        sensitive: true,
        doc: "Private key of this Cactus node (the API server)",
        env: "PRIVATE_KEY",
        arg: "private-key",
        format: ConfigService.formatNonBlankString,
        default: null as any,
      },
      keychainSuffixPrivateKey: {
        doc:
          "The key under which to store/retrieve the private key from the keychain of this Cactus node (API server)" +
          "The complete lookup key is constructed from the ${CACTUS_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.",
        env: "KEYCHAIN_SUFFIX_PRIVATE_KEY",
        arg: "keychain-suffix-private-key",
        format: "*",
        default: "CACTUS_NODE_PRIVATE_KEY",
      },
      keychainSuffixPublicKey: {
        doc:
          "The key under which to store/retrieve the public key from the keychain of this Cactus node (API server)" +
          "The complete lookup key is constructed from the ${CACTUS_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.",
        env: "KEYCHAIN_SUFFIX_PUBLIC_KEY",
        arg: "keychain-suffix-public-key",
        format: "*",
        default: "CACTUS_NODE_PUBLIC_KEY",
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
  public newExampleConfigEnv(
    cactusApiServerOptions?: ICactusApiServerOptions
  ): { [key: string]: string } {
    cactusApiServerOptions = cactusApiServerOptions || this.newExampleConfig();
    const configSchema: any = ConfigService.getConfigSchema();
    return Object.entries(cactusApiServerOptions).reduce(
      (acc: any, [key, value]) => {
        const schemaObj: any = configSchema[key];
        acc[schemaObj.env] = value;
        return acc;
      },
      {}
    );
  }

  public newExampleConfigConvict(
    cactusApiServerOptions?: ICactusApiServerOptions
  ): Config<ICactusApiServerOptions> {
    cactusApiServerOptions = cactusApiServerOptions || this.newExampleConfig();
    const env = this.newExampleConfigEnv(cactusApiServerOptions);
    return this.getOrCreate({ env });
  }

  public newExampleConfig(): ICactusApiServerOptions {
    const schema = ConfigService.getConfigSchema();

    // FIXME most of this lowever level crypto code should be in a commons package that's universal
    let privateKeyBytes;
    do {
      privateKeyBytes = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privateKeyBytes));

    const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes);
    const privateKey = Buffer.from(privateKeyBytes).toString("hex");
    const publicKey = Buffer.from(publicKeyBytes).toString("hex");

    const apiTlsEnabled: boolean = (schema.apiTlsEnabled as SchemaObj).default;
    const apiHost = (schema.apiHost as SchemaObj).default;
    const apiPort = (schema.apiPort as SchemaObj).default;

    // const apiProtocol = apiTlsEnabled ? "https:" : "http";
    // const apiBaseUrl = `${apiProtocol}//${apiHost}:${apiPort}`;

    const cockpitTlsEnabled: boolean = (schema.cockpitTlsEnabled as SchemaObj)
      .default;
    const cockpitHost = (schema.cockpitHost as SchemaObj).default;
    const cockpitPort = (schema.cockpitPort as SchemaObj).default;

    // const cockpitProtocol = cockpitTlsEnabled ? "https:" : "http";
    // const cockpitBaseUrl = `${cockpitProtocol}//${cockpitHost}:${cockpitPort}`;

    const pkiGenerator = new SelfSignedPkiGenerator();
    const pkiServer: IPki = pkiGenerator.create("localhost");
    // const pkiClient: IPki = pkiGenerator.create("localhost", pkiServer);

    const plugins = [
      {
        packageName: "@hyperledger/cactus-plugin-kv-storage-memory",
        options: {},
      },
      {
        packageName: "@hyperledger/cactus-plugin-keychain-memory",
        options: {},
      },
      {
        packageName: "@hyperledger/cactus-plugin-web-service-consortium",
        options: {
          privateKey,
        },
      },
    ];

    return {
      configFile: ".config.json",
      cactusNodeId: uuidV4(),
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
      cockpitHost,
      cockpitPort,
      cockpitWwwRoot: (schema.cockpitWwwRoot as SchemaObj).default,
      cockpitCorsDomainCsv: (schema.cockpitCorsDomainCsv as SchemaObj).default,
      cockpitMtlsEnabled: false,
      cockpitTlsEnabled,
      cockpitTlsCertPem: pkiServer.certificatePem,
      cockpitTlsKeyPem: pkiServer.privateKeyPem,
      cockpitTlsClientCaPem: "-", // Cockpit mTLS is off so this will not crash the server
      publicKey,
      privateKey,
      keychainSuffixPublicKey: (schema.keychainSuffixPublicKey as SchemaObj)
        .default,
      keychainSuffixPrivateKey: (schema.keychainSuffixPrivateKey as SchemaObj)
        .default,
      plugins,
    };
  }

  getOrCreate(options?: {
    env?: any;
    args?: string[];
  }): Config<ICactusApiServerOptions> {
    if (!ConfigService.config) {
      const schema: Schema<ICactusApiServerOptions> = ConfigService.getConfigSchema();
      ConfigService.config = (convict as any)(schema, options);
      if (ConfigService.config.get("configFile")) {
        const configFilePath = ConfigService.config.get("configFile");
        ConfigService.config.loadFile(configFilePath);
      }
      ConfigService.config.validate();
      this.validateKeyPairMatch();
      const level = ConfigService.config.get("logLevel");
      const logger: Logger = LoggerProvider.getOrCreate({
        label: "config-service",
        level,
      });
      logger.info("Configuration validation OK.");
    }
    return ConfigService.config;
  }

  /**
   * Validation that prevents operators from mistakenly deploying a public key
   * that they may not have the private key for or vica versa.
   *
   * @throws If the private key and the public key are not part of the same key pair.
   */
  validateKeyPairMatch(): void {
    // FIXME most of this lowever level crypto code should be in a commons package that's universal
    const privateKey = ConfigService.config.get("privateKey");
    const privateKeyBytes = Uint8Array.from(Buffer.from(privateKey, "hex"));
    const publicKey = ConfigService.config.get("publicKey");
    const expectedPublicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes);
    const expectedPublicKey = Buffer.from(expectedPublicKeyBytes).toString(
      "hex"
    );
    if (publicKey !== expectedPublicKey) {
      throw new Error(
        `Public key does not match private key. Configured=${publicKey} Expected=${expectedPublicKey}`
      );
    }
  }
}
