import { Express } from "express";
import {
  importPKCS8,
  GeneralSign,
  SignJWT,
  compactVerify,
  importSPKI,
  JWK,
} from "jose";
import { v4 as uuidv4 } from "uuid";

import OAS from "../json/openapi.json";

import {
  BroadcastRequestV1,
  DefaultApi as ConsortiumManagerApi,
} from "./generated/openapi/typescript-axios";

import {
  ConsortiumDatabase,
  IPluginWebService,
  IWebServiceEndpoint,
  ICactusPlugin,
  ICactusPluginOptions,
  JWSGeneral,
  JWSRecipient,
  CactusNode,
  Ledger,
  PluginInstance,
} from "@hyperledger/cactus-core-api";

import { PluginRegistry } from "@hyperledger/cactus-core";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import {
  Checks,
  Logger,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import { GetConsortiumEndpointV1 } from "./consortium/get-consortium-jws-endpoint-v1";
import { GetNodeJwsEndpoint } from "./consortium/get-node-jws-endpoint-v1";

import { PrometheusExporter } from "./prometheus-exporter/prometheus-exporter";

import {
  IGetPrometheusExporterMetricsEndpointV1Options,
  GetPrometheusExporterMetricsEndpointV1,
} from "./consortium/get-prometheus-exporter-metrics-endpoint-v1";

import {
  Configuration,
  DefaultApi,
  NewNodeRequestV1,
} from "./generated/openapi/typescript-axios";
import { StaticConsortiumRepository } from "./repository/static-consortium-repository";
import { AddNewNodeEndpoint } from "./consortium/add-new-node-endpoint-v1";
import { BadRequestError, InternalServerError } from "http-errors-enhanced-cjs";
import { ProcessBroadcastEndpoint } from "./consortium/process-broadcast-endpoint-v1";
import { PolicyGroup } from "./policy-model/policy-group";
export interface IWebAppOptions {
  port: number;
  hostname: string;
}

export interface IKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface IPluginConsortiumStaticOptions extends ICactusPluginOptions {
  keyPairPem: string;
  keyPairPub: string;
  consortiumDatabase: ConsortiumDatabase;
  node: CactusNode;
  ledgers: Ledger[];
  pluginInstances: PluginInstance[];
  memberId: string;
  entitiesJWK: { [key: string]: JWK };
  rootPolicyGroup?: PolicyGroup;
  packageConfigs?: { [key: string]: unknown };
  prometheusExporter?: PrometheusExporter;
  pluginRegistry?: PluginRegistry;
  logLevel?: LogLevelDesc;
  ctorArgs?: Record<string, unknown>;
}

export class PluginConsortiumStatic
  implements ICactusPlugin, IPluginWebService
{
  public static readonly CLASS_NAME = "PluginConsortiumStatic";
  public prometheusExporter: PrometheusExporter;
  private readonly log: Logger;
  private readonly instanceId: string;
  private readonly repo: StaticConsortiumRepository;
  private endpoints: IWebServiceEndpoint[] | undefined;

  public get className(): string {
    return PluginConsortiumStatic.CLASS_NAME;
  }

  constructor(public readonly options: IPluginConsortiumStaticOptions) {
    const fnTag = `PluginConsortiumStatic#constructor()`;
    if (!options) {
      throw new Error(`${fnTag} options falsy.`);
    }
    Checks.truthy(options.instanceId, `${fnTag} options.instanceId`);
    Checks.truthy(
      options.consortiumDatabase,
      `${fnTag} options.consortiumDatabase`,
    );

    this.log = LoggerProvider.getOrCreate({
      label: "plugin-consortium-static",
      level: options.logLevel ? options.logLevel : "INFO",
    });

    this.instanceId = this.options.instanceId;
    this.repo = new StaticConsortiumRepository({
      db: options.consortiumDatabase,
      node: options.node,
      ledgers: options.ledgers,
      pluginInstances: options.pluginInstances,
      memberId: options.memberId,
      rootPolicyGroup: options.rootPolicyGroup,
      packageConfigs: options.packageConfigs,
      entitiesJWK: options.entitiesJWK,
    });

    this.prometheusExporter =
      options.prometheusExporter ||
      new PrometheusExporter({ pollingIntervalInMin: 1 });

    Checks.truthy(
      this.prometheusExporter,
      `${fnTag} options.prometheusExporter`,
    );
    this.prometheusExporter.startMetricsCollection();
    this.prometheusExporter.setNodeCount(this.getNodeCount());
  }

  public getOpenApiSpec(): unknown {
    return OAS;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  public async onPluginInit(): Promise<unknown> {
    return;
  }

  public getPrometheusExporter(): PrometheusExporter {
    return this.prometheusExporter;
  }

  public async shutdown(): Promise<void> {
    return;
  }

  public async getPrometheusExporterMetrics(): Promise<string> {
    const res: string = await this.prometheusExporter.getPrometheusMetrics();
    this.log.debug(`getPrometheusExporterMetrics() response: %o`, res);
    return res;
  }

  public getNodeCount(): number {
    Checks.truthy(this.repo, `${this.className}.this.repo`);
    return this.repo.allNodes.length;
  }
  /**
   * Updates the Node count Prometheus metric of the plugin.
   * Note: This does not change the underlying consortium database at all,
   * only affects **the metrics**.
   */
  public updateMetricNodeCount(): void {
    const nodeCount = this.getNodeCount();
    this.prometheusExporter.setNodeCount(nodeCount);
  }

  public async registerWebServices(
    app: Express,
  ): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => ws.registerExpress(app));
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const { log } = this;
    const pkgName = this.getPackageName();

    if (this.endpoints) {
      return this.endpoints;
    }
    log.info(`Creating web services for plugin ${pkgName}...`);
    // presence of webAppOptions implies that caller wants the plugin to configure it's own express instance on a custom
    // host/port to listen on

    const { keyPairPem } = this.options;
    const consortiumRepo = this.repo;

    const endpoints: IWebServiceEndpoint[] = [];
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new AddNewNodeEndpoint(options);
      endpoints.push(endpoint);
      const path = endpoint.getPath();
      this.log.info(`Instantiated AddNodeEndpoint at ${path}`);
    }
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new ProcessBroadcastEndpoint(options);
      endpoints.push(endpoint);
      const path = endpoint.getPath();
      this.log.info(`Instantiated AddNodeEndpoint at ${path}`);
    }
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new GetConsortiumEndpointV1(options);
      endpoints.push(endpoint);
      const path = endpoint.getPath();
      this.log.info(`Instantiated GetConsortiumEndpointV1 at ${path}`);
    }
    {
      const options = { keyPairPem, consortiumRepo, plugin: this };
      const endpoint = new GetNodeJwsEndpoint(options);
      const path = endpoint.getPath();
      endpoints.push(endpoint);
      this.log.info(`Instantiated GetNodeJwsEndpoint at ${path}`);
    }
    {
      const opts: IGetPrometheusExporterMetricsEndpointV1Options = {
        plugin: this,
        logLevel: this.options.logLevel,
      };
      const endpoint = new GetPrometheusExporterMetricsEndpointV1(opts);
      const path = endpoint.getPath();
      endpoints.push(endpoint);
      this.log.info(`Instantiated GetNodeJwsEndpoint at ${path}`);
    }
    this.endpoints = endpoints;

    log.info(`Instantiated web svcs for plugin ${pkgName} OK`, { endpoints });
    return endpoints;
  }

  public getPackageName(): string {
    return `@hyperledger/cacti-plugin-consortium-static`;
  }

  public async getNodeJws(): Promise<JWSGeneral> {
    Checks.truthy(this.repo, `${this.className}.this.repo`);
    const { keyPairPem } = this.options;

    this.updateMetricNodeCount();
    const keyPair = await importPKCS8(keyPairPem, "ES256K");
    const payloadObject = { consortiumDatabase: this.repo.consortiumDatabase };
    const payloadJson = safeStableStringify(payloadObject);
    const _protected = {
      iat: Date.now(),
      jti: uuidv4(),
      iss: "Hyperledger Cactus",
    };
    // TODO: double check if this casting is safe (it is supposed to be)
    const encoder = new TextEncoder();
    const sign = new GeneralSign(encoder.encode(payloadJson));
    sign
      .addSignature(keyPair)
      .setProtectedHeader({ alg: "ES256K", _protected });
    const jwsGeneral = await sign.sign();
    return jwsGeneral as JWSGeneral;
  }

  public broadcastJoinRequest(req: NewNodeRequestV1) {
    const nodes = this.repo.allNodes.filter((node) => {
      return (
        node.id !== this.repo.getSelfData().node.id && node.id !== req.node.id
      );
    });
    this.log.info(
      "Will broadcast to nodes: ",
      nodes.map((node) => {
        return node.id;
      }),
    );
    nodes.forEach(async (node) => {
      const api = new ConsortiumManagerApi(
        new Configuration({ basePath: node.nodeApiHost }),
      );
      const message = {
        message: req,
        pubKey: this.options.keyPairPub,
      };
      const msgStringified = safeStableStringify(message);
      if (typeof msgStringified !== "string") {
        throw new InternalServerError(
          "getNodeJws#safeStableStringify() returned with non-string value.",
        );
      }
      const sig = await this.sign(msgStringified);

      const broadcast: BroadcastRequestV1 = {
        message,
        signature: sig,
      };
      api.receiveBroadcastV1(broadcast);
    });
  }

  public async getConsortiumJws(): Promise<JWSGeneral> {
    const nodes = this.repo.allNodes;

    const ctorArgs = this.options.ctorArgs || {};

    const requests = nodes
      .map((cnm) => cnm.nodeApiHost)
      .map(function (host) {
        // overwrite basePath with node api host
        ctorArgs.basePath = host;
        // return the ApiClient configuration object
        return new Configuration(ctorArgs);
      })
      .map((configuration) => new DefaultApi(configuration))
      .map((apiClient) => apiClient.getNodeJwsV1());

    const responses = await Promise.all(requests);

    const signatures: JWSRecipient[] = [];

    responses
      .map((apiResponse) => apiResponse.data)
      .map((getNodeJwsResponse) => getNodeJwsResponse.jws)
      .forEach((aJws: JWSGeneral) =>
        aJws.signatures.forEach((signature) => signatures.push(signature)),
      );

    const [response] = responses;
    const jws = response.data.jws;
    jws.signatures = signatures;
    return jws;
  }

  public async processNewNodeRequest(req: NewNodeRequestV1) {
    const fn = `${PluginConsortiumStatic.CLASS_NAME}#processNewNodeRequest()`;
    const identity = req.identity;

    Checks.nonBlankString(identity.pubKey);
    const msg = {
      identity,
      treeHash: req.treeHash,
      node: req.node,
      ledger: req.ledger,
      pluginInstance: req.pluginInstance,
    };

    const msgStringified = safeStableStringify(msg);
    if (typeof msgStringified !== "string") {
      throw new InternalServerError(
        "processNodeRequest#safeStableStringify() returned with non-string value.",
      );
    }
    if (
      !(await this.verifySignature(
        req.signature,
        msgStringified,
        identity.pubKey,
      ))
    ) {
      throw new BadRequestError(fn + ": Signature is invalid.");
    }

    // TODO: make verification of publicKey process configurable!
    // Ideally, we want to allow for entities to customize their identification process
    // It would allow for integrations with different methods, serving different requirements

    // What is done is: the request to join consortium includes a JWT token that must be signed by one of the
    // organizations that already belongs to the consortium.
    // Basically we support adding new nodes, but not new organizations
    if (!(await this.repo.verifyJWT(identity.proof, req.node.memberId))) {
      throw new BadRequestError(
        fn +
          ": Your token from organization " +
          req.node.memberId +
          " is invalid.",
      );
    }

    const policyAssertion = req.treeHash;
    try {
      if (!this.verifySettings(policyAssertion)) {
        throw new BadRequestError(
          fn +
            ": Your policy & configuration settings do not match the ones used in this consortium.",
        );
      }
    } catch (err) {
      throw new BadRequestError(fn + err.message);
    }

    this.repo.addNode(req.node, req.pluginInstance, req.ledger);
    this.updateMetricNodeCount();
  }

  private verifySettings(assert: string): boolean {
    const self = this.repo.getPolicyTreeProof() + this.repo.getConfigsProof();
    this.log.info(self);
    this.log.info(assert);
    return self === assert;
  }

  async sign(msg: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(msg);
    const privateKey = await importPKCS8(this.options.keyPairPem, "ES256K");
    const _protected = {
      iat: Date.now(),
      jti: uuidv4(),
      iss: "Hyperledger Cactus",
    };
    const signature = await new SignJWT({ data: Array.from(data) })
      .setProtectedHeader({ alg: "ES256K", _protected })
      .sign(privateKey);
    return signature;
  }

  async verifySignature(
    signature: string,
    msg: string,
    pubKey: string,
  ): Promise<boolean> {
    const publicKey = await importSPKI(pubKey, "ES256K");
    const { payload } = await compactVerify(signature, publicKey);

    // Extract the original message
    const parsedPayload = JSON.parse(payload.toString());
    const signedData = new Uint8Array(parsedPayload.data);
    const decodedMessage = new TextDecoder().decode(signedData);
    return decodedMessage === msg;
  }

  public async joinConsortium(managerApi: ConsortiumManagerApi, jwt: string) {
    const fn = `${PluginConsortiumStatic.CLASS_NAME}#joinConsortium()`;
    const nodeInfo = this.repo.getSelfData();
    const treeHash =
      this.repo.getPolicyTreeProof() + this.repo.getConfigsProof();

    this.log.info(treeHash);
    const msg = safeStableStringify({
      identity: {
        pubKey: this.options.keyPairPub,
        memberId: nodeInfo.memberId,
        proof: jwt, //token signed by the organization identified by nodeInfo.memberId
      },
      treeHash,
      node: nodeInfo.node,
      ledger: nodeInfo.ledgers,
      pluginInstance: nodeInfo.pluginInstances,
    }) as string;

    const request: NewNodeRequestV1 = {
      identity: {
        pubKey: this.options.keyPairPub,
        memberId: nodeInfo.memberId,
        proof: jwt,
      },
      treeHash,
      node: nodeInfo.node,
      ledger: nodeInfo.ledgers,
      pluginInstance: nodeInfo.pluginInstances,
      signature: await this.sign(msg),
    };

    const response = await managerApi.addNodeToConsortiumV1(request);

    if (!response) {
      throw new InternalServerError(`${fn} response is falsy`);
    }
    if (!response.status) {
      throw new InternalServerError(`${fn} response.status is falsy`);
    }
    const { status, data, statusText, config } = response;
    if (response.status < 200 || response.status > 300) {
      // We log the error here on the debug level so that later on we can inspect the contents
      // of it in the logs if we need to. The reason that this is important is because we do not
      // want to dump the full response onto our own error response that is going back to the caller
      // due to that potentially being a security issue that we are exposing internal data via the
      // error responses.
      // With that said, we still need to make sure that we can determine the root cause of any
      // issues after the fact and therefore we must save the error response details somewhere (the logs)
      this.log.debug(
        "ConsortiumApi non-2xx HTTP response:",
        data,
        status,
        config,
      );

      // For the caller/client we just send back a generic error admitting that we somehow messed up:
      const errorMessage = `${fn} ConsortiumStaticApi error status: ${status}: ${statusText}`;
      throw new InternalServerError(errorMessage);
    }
    if (!data) {
      throw new InternalServerError(`${fn} response.data is falsy`);
    }
    Checks.truthy(response.data.jws, `${fn}::response.jws`);
    Checks.truthy(response.data.jws.payload, `${fn}::response.jws.payload`);
    const json = Buffer.from(response.data.jws.payload, "base64").toString();
    const body = JSON.parse(json);
    const { consortiumDatabase }: { consortiumDatabase: ConsortiumDatabase } =
      body;

    this.repo.populateDb(consortiumDatabase);
    this.updateMetricNodeCount();
  }
}
