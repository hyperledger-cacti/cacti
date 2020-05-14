import convict, { Schema, Config } from 'convict';
import secp256k1 from 'secp256k1';

export interface IBifApiServerOptions {
  configFile: string;
  cockpitHost: string;
  cockpitPort: number;
  cockpitWwwRoot: string;
  apiHost: string;
  apiPort: number;
  apiCorsDomainCsv: string;
  storagePluginPackage: string;
  storagePluginOptionsJson: string;
  publicKey: string;
  privateKey: string;
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
        default: 'node_modules/@hyperledger-labs/bif-cockpit/www/',
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
        doc: 'The Comma seperated list of domains to allow Cross Origin Resource Sharing from when serving API requests.',
        format: '*',
        env: 'API_CORS_DOMAIN_CSV',
        arg: 'api-cors-domain-csv',
        default: '',
      },
      storagePluginPackage: {
        doc: 'The NodeJS package name that will be dynamically imported. ' +
          'You have to make sure that this is installed prior to starting the API server. ' +
          'Defaults to the in-memory storage plugin that is NOT for production use.',
        format: '*',
        env: 'STORAGE_PLUGIN_PACKAGE',
        arg: 'storage-plugin-package',
        default: '@hyperledger-labs/bif-plugin-kv-storage-memory'
      },
      storagePluginOptionsJson: {
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
        format: (val) => {
          if (typeof val === 'undefined' || val === null || val === '') {
            throw new Error('must be a non-empty string');
          }
        },
        default: null as any,
      },
      privateKey: {
        sensitive: true,
        doc: 'Private key of this BIF node (the API server)',
        env: 'PRIVATE_KEY',
        arg: 'private-key',
        format: (val) => {
          if (typeof val === 'undefined' || val === null || val === '') {
            throw new Error('must be a non-empty string');
          }
        },
        default: null as any,
      }
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
      const privateKey = ConfigService.config.get('privateKey');
      const privateKeyBytes = Uint8Array.from(Buffer.from(privateKey, 'hex'));
      const publicKey = ConfigService.config.get('publicKey');
      const expectedPublicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes);
      const expectedPublicKey = Buffer.from(expectedPublicKeyBytes).toString('hex');
      if (publicKey !== expectedPublicKey) {
        throw new Error(`Public key does not match private key. Configured=${publicKey} Expected=${expectedPublicKey}`);
      }
    }
    return ConfigService.config;
  }
}