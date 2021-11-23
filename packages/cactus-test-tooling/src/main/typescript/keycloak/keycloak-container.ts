import { EventEmitter } from "events";
import Docker, { Container } from "dockerode";
import { v4 as internalIpV4 } from "internal-ip";
import { v4 as uuidv4 } from "uuid";
import KcAdminClient from "keycloak-admin";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

import { Containers } from "../common/containers";
import RealmRepresentation from "keycloak-admin/lib/defs/realmRepresentation";

export interface IKeycloakContainerOptions {
  envVars?: string[];
  imageVersion?: string;
  imageName?: string;
  adminUsername?: string;
  adminPassword?: string;
  logLevel?: LogLevelDesc;
}

export const K_DEFAULT_KEYCLOAK_IMAGE_NAME = "jboss/keycloak";
export const K_DEFAULT_KEYCLOAK_IMAGE_VERSION = "11.0.3";
export const K_DEFAULT_KEYCLOAK_HTTP_PORT = 8080;

/**
 * Class responsible for programmatically managing a container that is running
 * the image made for hosting a keycloak instance which can be used to test
 * authorization/authentication related use-cases.
 */
export class KeycloakContainer {
  public static readonly CLASS_NAME = "KeycloakContainer";
  private readonly log: Logger;
  private readonly imageName: string;
  private readonly imageVersion: string;
  private readonly _adminUsername: string;
  private readonly _adminPassword: string;
  private readonly envVars: string[];
  private _container: Container | undefined;
  private _containerId: string | undefined;

  public get imageFqn(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public get className(): string {
    return KeycloakContainer.CLASS_NAME;
  }

  public get container(): Container {
    if (this._container) {
      return this._container;
    } else {
      throw new Error(`Invalid state: _container is not set. Called start()?`);
    }
  }

  constructor(public readonly options: IKeycloakContainerOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.imageName = this.options.imageName || K_DEFAULT_KEYCLOAK_IMAGE_NAME;
    this.imageVersion =
      this.options.imageVersion || K_DEFAULT_KEYCLOAK_IMAGE_VERSION;
    this.envVars = this.options.envVars || [];

    this._adminPassword = options.adminPassword || uuidv4();
    this._adminUsername = options.adminUsername || "admin";

    this.log.info(`Created ${this.className} OK. Image FQN: ${this.imageFqn}`);
  }

  public async start(): Promise<Container> {
    if (this._container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    await Containers.pullImage(this.imageFqn, {}, this.options.logLevel);

    const Env = [
      ...[
        `KEYCLOAK_USER=${this._adminUsername}`,
        `KEYCLOAK_PASSWORD=${this._adminPassword}`,
        `PROXY_ADDRESS_FORWARDING=true`,
        `DEBUG=true`,
        `DEBUG_PORT='*:8787'`,
      ],
      ...this.envVars,
    ];
    this.log.debug(`Effective Env of container: %o`, Env);

    const Healthcheck = {
      Test: ["CMD-SHELL", `curl -v 'http://localhost:9990/'`],
      Interval: 1000000000, // 1 second
      Timeout: 3000000000, // 3 seconds
      Retries: 99,
      StartPeriod: 1000000000, // 1 second
    };

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        this.imageFqn,
        [],
        [],
        {
          Env,
          PublishAllPorts: true,
          Healthcheck,
        },
        {},
        (err?: Error) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this._container = container;
        this._containerId = container.id;
        try {
          await Containers.waitForHealthCheck(this._containerId);
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  // {
  //   authorizationURL: "https://www.example.com/oauth2/authorize",
  //   tokenURL: "https://www.example.com/oauth2/token",
  //   clientID: "EXAMPLE_CLIENT_ID",
  //   clientSecret: "EXAMPLE_CLIENT_SECRET",
  //   callbackURL: "http://localhost:3000/auth/example/callback",
  // }
  public async getOauth2Options(clientId = "account"): Promise<unknown> {
    const fnTag = `${this.className}#getOauth2Options()`;
    const { log } = this;
    const defaultRealm = await this.getDefaultRealm();
    const apiBaseUrl = await this.getApiBaseUrl();
    const kcAdminClient = await this.createAdminClient();
    const realm = defaultRealm.realm;
    const realmBaseUrl = `${apiBaseUrl}/realms/${realm}`;

    const clients = await kcAdminClient.clients.find({});

    const aClient = clients.find((c) => c.clientId === clientId);
    if (!aClient) {
      throw new Error(`${fnTag} could not find client with ID ${clientId}`);
    }

    const secret = await kcAdminClient.clients.getClientSecret({
      id: aClient.id as string,
    });

    const oauth2Options = {
      // http://<host>:<ip>/auth/realms/<realm>/protocol/openid-connect/token
      authorizationURL: `${realmBaseUrl}/protocol/openid-connect/auth`,
      tokenURL: `${realmBaseUrl}/protocol/openid-connect/token`,
      clientID: clientId,
      clientSecret: secret.value,
    };
    log.debug(`OAuth2_Options for passport strategy: %o`, oauth2Options);
    return oauth2Options;
  }

  public async getOidcOptions(clientId = "account"): Promise<unknown> {
    const fnTag = `${this.className}#getOidcOptions()`;
    const { log } = this;
    const defaultRealm = await this.getDefaultRealm();
    const apiBaseUrl = await this.getApiBaseUrl();
    const kcAdminClient = await this.createAdminClient();
    const realm = defaultRealm.realm;
    const realmBaseUrl = `${apiBaseUrl}/realms/${realm}`;

    const clients = await kcAdminClient.clients.find({});

    const aClient = clients.find((c) => c.clientId === clientId);
    if (!aClient) {
      throw new Error(`${fnTag} could not find client with ID ${clientId}`);
    }

    const secret = await kcAdminClient.clients.getClientSecret({
      id: aClient.id as string,
    });

    const oidcOptions = {
      // http://<host>:<ip>/auth/realms/<realm>/protocol/openid-connect/token
      authorizationURL: `${realmBaseUrl}/protocol/openid-connect/auth`,
      tokenURL: `${realmBaseUrl}/protocol/openid-connect/token`,
      userProfileURL: `${realmBaseUrl}/protocol/openid-connect/userinfo`,
      clientID: clientId,
      clientSecret: secret.value,
      callbackURL: `${realmBaseUrl}/account?referrer=${clientId}`,
    };
    log.debug(`OIDC_Options for passport strategy: %o`, oidcOptions);
    return oidcOptions;
  }

  // FIXME - this does not work yet
  public async getSaml2Options(
    clientId: string,
    callbackUrl: string,
  ): Promise<unknown> {
    const fnTag = `${this.className}#getSaml2Options()`;
    Checks.truthy(clientId, `${fnTag}:clientId`);
    const { log } = this;
    const defaultRealm = await this.getDefaultRealm();
    const apiBaseUrl = await this.getApiBaseUrl("localhost");
    const realm = defaultRealm.realm;
    const realmBaseUrl = `${apiBaseUrl}/realms/${realm}`;

    const kcAdminClient = await this.createAdminClient();
    const clients = await kcAdminClient.clients.find({});
    const client = clients.find((c) => c.clientId === clientId);
    log.debug("SAML2 client: %o", JSON.stringify(client, null, 4));

    // http://localhost:32819/auth/realms/master/protocol/saml
    const saml2Opts = {
      entryPoint: `${realmBaseUrl}/protocol/saml`,
      // issuer: 'https://your-app.example.net/login/callback',
      callbackUrl,
      issuer: client?.clientId,
    };
    log.debug(`SAML2_Options for passport strategy: %o`, saml2Opts);
    return saml2Opts;
  }

  public async getApiBaseUrl(host?: string): Promise<string> {
    const port = await this.getHostPortHttp();
    const lanIpV4OrUndefined = await internalIpV4();
    const lanAddress = host || lanIpV4OrUndefined || "127.0.0.1"; // best effort...
    return `http://${lanAddress}:${port}/auth`;
  }

  public async getDefaultRealm(): Promise<RealmRepresentation> {
    const kcAdminClient = await this.createAdminClient();
    const [firstRealm] = await kcAdminClient.realms.find({});
    return firstRealm;
  }

  public async createAdminClient(): Promise<KcAdminClient> {
    const baseUrl = await this.getApiBaseUrl();
    const kcAdminClient = new KcAdminClient({
      baseUrl,
      realmName: "master",
      requestConfig: {
        /* Axios request config options https://github.com/axios/axios#request-config */
      },
    });

    this.log.debug(`Authenticating against the Keycloak admin API...`);
    // Authorize with username / password
    await kcAdminClient.auth({
      username: this._adminUsername,
      password: this._adminPassword,
      grantType: "password",
      clientId: "admin-cli",
    });
    this.log.debug(`Keycloak admin API auth OK`);
    return kcAdminClient;
  }

  public async ensureRealmExists(
    realmRepresentation: RealmRepresentation,
  ): Promise<unknown> {
    const fnTag = `${this.className}#ensureRealmExists()`;
    Checks.truthy(realmRepresentation, `${fnTag}:realmRepresentation`);
    Checks.nonBlankString(
      realmRepresentation.realm,
      `${fnTag}:realmRepresentation.realm`,
    );
    const realmName = realmRepresentation.realm;

    const kcAdminClient = await this.createAdminClient();

    this.log.debug(`Looking for realm with name ${realmName} ...`);
    const realms = await kcAdminClient.realms.find({});
    this.log.debug(`Fetched a list of realms ${realms.length} long...`);
    const aRealm = realms.find((r) => r.realm === realmName);
    if (aRealm) {
      this.log.debug(`Returning pre-existing realm, skip create: %o`, aRealm);
      return aRealm;
    }

    this.log.debug(`Creating ${realmName} realm... %o`, realmRepresentation);
    const newRealm = await kcAdminClient.realms.create(realmRepresentation);
    this.log.debug(`Created new realm: %o`, newRealm);
    return newRealm;
  }

  public async createTestUser(
    payload?: UserRepresentation & { realm?: string },
  ): Promise<{ id: string }> {
    const kcAdminClient = await this.createAdminClient();

    // List all users
    const users = await kcAdminClient.users.find();
    this.log.debug(`Users: %o`, users);

    // Override client configuration for all further requests:
    // kcAdminClient.setConfig({
    //   realmName: "another-realm",
    // });

    // This operation will now be performed in 'another-realm' if the user has access.
    const groups = await kcAdminClient.groups.find();
    this.log.debug(`Groups: %o`, groups);

    // Set a `realm` property to override the realm for only a single operation.
    // For example, creating a user in another realm:
    const theUser = await kcAdminClient.users.create(payload);
    this.log.debug(`Created new user: %o`, theUser);
    return theUser;
  }

  public async stop(): Promise<void> {
    if (this._container) {
      await Containers.stop(this.container);
    }
  }

  public destroy(): Promise<void> {
    const fnTag = `${this.className}#destroy()`;
    if (this._container) {
      return this._container.remove();
    } else {
      const ex = new Error(`${fnTag} Container not found, nothing to destroy.`);
      return Promise.reject(ex);
    }
  }

  public async getHostPortHttp(): Promise<number> {
    const fnTag = `${this.className}#getHostPortHttp()`;
    if (this._containerId) {
      const cInfo = await Containers.getById(this._containerId);
      return Containers.getPublicPort(K_DEFAULT_KEYCLOAK_HTTP_PORT, cInfo);
    } else {
      throw new Error(`${fnTag} Container ID not set. Did you call start()?`);
    }
  }
}
