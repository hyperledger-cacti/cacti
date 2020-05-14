import { randomBytes } from 'crypto';
import convict, { Schema, Config, SchemaObj } from 'convict';
import secp256k1 from 'secp256k1';
import { v4 as uuidV4 } from 'uuid';
import { LoggerProvider, Logger } from '@hyperledger-labs/bif-common';

export interface IBifApiServerOptions {
  configFile: string;
  bifNodeId: string;
  logLevel: string;
  cockpitHost: string;
  cockpitPort: number;
  cockpitWwwRoot: string;
  apiHost: string;
  apiPort: number;
  apiCorsDomainCsv: string;
  storagePluginPackage: string;
  storagePluginOptionsJson: string;
  keychainPluginPackage: string;
  keychainPluginOptionsJson: string;
  publicKey: string;
  privateKey: string;
  keychainSuffixPublicKey: string;
  keychainSuffixPrivateKey: string;
}

export class ConfigService {

  private static config: Config<IBifApiServerOptions>;

  private static readonly HELP_TEXT_HEADER: string =
    `Order of precedent for parameters in descdending order: CLI, Environment variables, Configuration file.\n` +
    `Passing "help" as the first argument prints this message and also dumps the effective configuration.\n\n` +
    `Configuration Parameters\n` +
    `========================\n\n`;

  public static getHelpText(): string {
    const schema: any = ConfigService.getConfigSchema();

    const argsHelpText = Object.keys(schema)
      .map((optionName: string) => {
        return `  ${optionName}:` +
          `\n\t\tDescription: ${schema[optionName].doc}` +
          `\n\t\tDefault: ${schema[optionName].default || 'Mandatory parameter without a default value.'}` +
          `\n\t\tEnv: ${schema[optionName].env}` +
          `\n\t\tCLI: --${schema[optionName].arg}`;
      }).join('\n');

    return this.HELP_TEXT_HEADER.concat(argsHelpText).concat('\n\n');
  }

  private static getConfigSchema(): Schema<IBifApiServerOptions> {
    return {
      configFile: {
        doc: 'The path to a config file that holds the configuration itself which will be parsed and validated.',
        format: '*',
        default: '',
        env: 'CONFIG_FILE',
        arg: 'config-file',
      },
      bifNodeId: {
        doc: 'Identifier of this particular BIF node. Must be unique among the total set of BIF nodes running in any ' +
          'given BIF deployment. Can be any string of characters such as a UUID or an Int64',
        format: ConfigService.formatNonBlankString,
        default: null as any,
        env: 'BIF_NODE_ID',
        arg: 'bif-node-id',
      },
      logLevel: {
        doc: 'The level at which loggers should be configured. Supported values include the following: ' +
          'error, warn, info, debug, trace',
        format: ConfigService.formatNonBlankString,
        default: 'warn',
        env: 'LOG_LEVEL',
        arg: 'log-level',
      },
      cockpitHost: {
        doc: 'The host to bind the Cockpit webserver to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.',
        format: 'ipaddress',
        default: '127.0.0.1',
        env: 'COCKPIT_HOST',
        arg: 'cockpit-host',
      },
      cockpitPort: {
        doc: 'The HTTP port to bind the Cockpit webserver to.',
        format: 'port',
        env: 'COCKPIT_PORT',
        arg: 'cockpit-port',
        default: 3000,
      },
      cockpitWwwRoot: {
        doc: 'The file-system path pointing to the static files of web application served as the cockpit by the API server.',
        format: '*',
        env: 'COCKPIT_WWW_ROOT',
        arg: 'cockpit-www-root',
        default: 'packages/bif-cmd-api-server/node_modules/@hyperledger-labs/bif-cockpit/www/',
      },
      apiHost: {
        doc: 'The host to bind the API to. Secure default is: 127.0.0.1. Use 0.0.0.0 to bind for any host.',
        format: 'ipaddress',
        env: 'API_HOST',
        arg: 'api-host',
        default: '127.0.0.1',
      },
      apiPort: {
        doc: 'The HTTP port to bind the API server endpoints to.',
        format: 'port',
        env: 'API_PORT',
        arg: 'api-port',
        default: 4000,
      },
      apiCorsDomainCsv: {
        doc: 'The Comma seperated list of domains to allow Cross Origin Resource Sharing from when ' +
          'serving API requests. The wildcard (*) character is supported to allow CORS for any and all domains, ' +
          'however using it is not recommended unless you are developing or demonstrating something with BIF.',
        format: '*',
        env: 'API_CORS_DOMAIN_CSV',
        arg: 'api-cors-domain-csv',
        default: '',
      },
      storagePluginPackage: {
        doc: 'The NodeJS package name that will be dynamically imported. ' +
          'You have to make sure that this is installed prior to starting the API server. ' +
          'Use "@hyperledger-labs/bif-plugin-kv-storage-memory" here for development' +
          'or demo environments with only a single node you can use ' +
          'the built-in stub that stores everything in-memory, un-encrypted:',
        format: ConfigService.formatNonBlankString,
        env: 'STORAGE_PLUGIN_PACKAGE',
        arg: 'storage-plugin-package',
        default: null as any
      },
      storagePluginOptionsJson: {
        doc: 'JSON string representing the options object that will be passed in to  the keychain plugin during initialization.',
        env: 'KEYCHAIN_PLUGIN_OPTIONS_JSON',
        arg: 'keychain-plugin-options-json',
        format: '*',
        default: '{}'
      },
      keychainPluginPackage: {
        doc: 'The NodeJS package name that will be dynamically imported. ' +
          'You have to make sure that this is installed prior to starting the API server. ' +
          'Use "@hyperledger-labs/bif-plugin-keychain-memory" here for development' +
          'or demo environments with only a single node you can use ' +
          'the built-in stub that stores everything in-memory, un-encrypted:',
        format: '*',
        env: 'KEYCHAIN_PLUGIN_PACKAGE',
        arg: 'keychain-plugin-package',
        default: null as any
      },
      keychainPluginOptionsJson: {
        doc: 'JSON string representing the options object that will be passed in to  the storage plugin during initialization.',
        env: 'STORAGE_PLUGIN_OPTIONS_JSON',
        arg: 'storage-plugin-options-json',
        format: '*',
        default: '{}'
      },
      publicKey: {
        doc: 'Public key of this BIF node (the API server)',
        env: 'PUBLIC_KEY',
        arg: 'public-key',
        format: ConfigService.formatNonBlankString,
        default: null as any,
      },
      privateKey: {
        sensitive: true,
        doc: 'Private key of this BIF node (the API server)',
        env: 'PRIVATE_KEY',
        arg: 'private-key',
        format: ConfigService.formatNonBlankString,
        default: null as any,
      },
      keychainSuffixPrivateKey: {
        doc: 'The key under which to store/retrieve the private key from the keychain of this BIF node (API server)' +
          'The complete lookup key is constructed from the ${BIF_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.',
        env: 'KEYCHAIN_SUFFIX_PRIVATE_KEY',
        arg: 'keychain-suffix-private-key',
        format: '*',
        default: 'BIF_NODE_PRIVATE_KEY',
      },
      keychainSuffixPublicKey: {
        doc: 'The key under which to store/retrieve the public key from the keychain of this BIF node (API server)' +
          'The complete lookup key is constructed from the ${BIF_NODE_ID}${KEYCHAIN_SUFFIX_PRIVATE_KEY} template.',
        env: 'KEYCHAIN_SUFFIX_PUBLIC_KEY',
        arg: 'keychain-suffix-public-key',
        format: '*',
        default: 'BIF_NODE_PUBLIC_KEY',
      }
    };
  }

  private static formatNonBlankString(value: unknown) {
    if (typeof value === 'undefined' || value === null || value === '') {
      throw new Error('must be a non-empty string');
    }
  }

  generateExampleConfig(): IBifApiServerOptions {
    const schema = ConfigService.getConfigSchema();

    // FIXME most of this lowever level crypto code should be in a commons package that's universal
    let privateKeyBytes
    do {
      privateKeyBytes = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(privateKeyBytes));

    const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes);
    const privateKey = Buffer.from(privateKeyBytes).toString('hex');
    const publicKey = Buffer.from(publicKeyBytes).toString('hex');

    return {
      configFile: '.config.json',
      bifNodeId: uuidV4(),
      logLevel: 'debug',
      publicKey,
      privateKey,
      apiCorsDomainCsv: (schema.apiCorsDomainCsv as SchemaObj).default,
      apiHost: (schema.apiHost as SchemaObj).default,
      apiPort: (schema.apiPort as SchemaObj).default,
      cockpitHost: (schema.cockpitHost as SchemaObj).default,
      cockpitPort: (schema.cockpitPort as SchemaObj).default,
      cockpitWwwRoot: (schema.cockpitWwwRoot as SchemaObj).default,
      keychainPluginPackage: '@hyperledger-labs/bif-plugin-keychain-memory',
      keychainPluginOptionsJson: (schema.keychainPluginOptionsJson as SchemaObj).default,
      keychainSuffixPublicKey: (schema.keychainSuffixPublicKey as SchemaObj).default,
      keychainSuffixPrivateKey: (schema.keychainSuffixPrivateKey as SchemaObj).default,
      storagePluginPackage: '@hyperledger-labs/bif-plugin-kv-storage-memory',
      storagePluginOptionsJson: (schema.storagePluginOptionsJson as SchemaObj).default,
    };
  }

  getOrCreate(): Config<IBifApiServerOptions> {
    if (!ConfigService.config) {
      const schema: Schema<IBifApiServerOptions> = ConfigService.getConfigSchema();
      ConfigService.config = convict(schema);
      if (ConfigService.config.get('configFile')) {
        const configFilePath = ConfigService.config.get('configFile');
        ConfigService.config.loadFile(configFilePath);
      }
      ConfigService.config.validate();
      this.validateKeyPairMatch();
      const level = ConfigService.config.get('logLevel');
      const logger: Logger = LoggerProvider.getOrCreate({ label: 'config-service', level });
      logger.info('Configuration validation OK.');
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
    const privateKey = ConfigService.config.get('privateKey');
    const privateKeyBytes = Uint8Array.from(Buffer.from(privateKey, 'hex'));
    const publicKey = ConfigService.config.get('publicKey');
    const expectedPublicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes);
    const expectedPublicKey = Buffer.from(expectedPublicKeyBytes).toString('hex');
    if (publicKey !== expectedPublicKey) {
      throw new Error(`Public key does not match private key. Configured=${publicKey} Expected=${expectedPublicKey}`);
    }
  }

}