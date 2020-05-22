import { randomBytes } from "crypto";
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
  cockpitHost: string;
  cockpitPort: number;
  cockpitWwwRoot: string;
  apiHost: string;
  apiPort: number;
  apiCorsDomainCsv: string;
  plugins: IPluginImport[];
  publicKey: string;
  privateKey: string;
  keychainSuffixPublicKey: string;
  keychainSuffixPrivateKey: string;
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

    return {
      plugins: [
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
            privateKey: "some-fake-key",
          },
        },
      ],
      configFile: ".config.json",
      cactusNodeId: uuidV4(),
      logLevel: "debug",
      publicKey,
      privateKey,
      apiCorsDomainCsv: (schema.apiCorsDomainCsv as SchemaObj).default,
      apiHost: (schema.apiHost as SchemaObj).default,
      apiPort: (schema.apiPort as SchemaObj).default,
      cockpitHost: (schema.cockpitHost as SchemaObj).default,
      cockpitPort: (schema.cockpitPort as SchemaObj).default,
      cockpitWwwRoot: (schema.cockpitWwwRoot as SchemaObj).default,
      keychainSuffixPublicKey: (schema.keychainSuffixPublicKey as SchemaObj)
        .default,
      keychainSuffixPrivateKey: (schema.keychainSuffixPrivateKey as SchemaObj)
        .default,
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
