/* eslint-disable @typescript-eslint/ban-types */
import {
  SecretManagerServiceClient,
  protos,
} from "@google-cloud/secret-manager";

import * as gax from "google-gax";
import { Descriptors } from "google-gax";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

export interface ISecretManagerServiceClientMock {
  logLevel?: LogLevelDesc;
}

export class SecretManagerServiceClientMock extends SecretManagerServiceClient {
  public static readonly CLASS_NAME = "SecretManagerServiceClientMock";
  private readonly log: Logger;

  private readonly secrets: Map<string, string>;

  public get className(): string {
    return SecretManagerServiceClientMock.CLASS_NAME;
  }

  constructor(public readonly options: ISecretManagerServiceClientMock) {
    super();
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;

    this.log = LoggerProvider.getOrCreate({ level, label });

    this.auth = ("" as unknown) as gax.GoogleAuth;
    this.descriptors = ("" as unknown) as Descriptors;
    this.innerApiCalls = ("" as unknown) as { [name: string]: Function };
    this.pathTemplates = ("" as unknown) as {
      [name: string]: gax.PathTemplate;
    };

    this.secrets = new Map<string, string>();
    this.log.info(`Created ${this.className}.`);
  }

  createSecret(
    request: protos.google.cloud.secretmanager.v1.ICreateSecretRequest,
  ): Promise<
    [
      protos.google.cloud.secretmanager.v1.ISecret,
      protos.google.cloud.secretmanager.v1.ICreateSecretRequest | undefined,
      {} | undefined,
    ]
  > {
    if (request.secretId && request.parent) {
      this.secrets.set(request.secretId, "");
      const result = {
        name: `${request.parent}?${request.secretId}`,
      };
      return ([result] as unknown) as Promise<
        [
          protos.google.cloud.secretmanager.v1.ISecret,
          protos.google.cloud.secretmanager.v1.ICreateSecretRequest | undefined,
          {} | undefined,
        ]
      >;
    } else {
      throw new Error(
        "Incomplete secret details. Required request.secretId and request.parent",
      );
    }
  }

  addSecretVersion(
    request: protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest,
  ): Promise<
    [
      protos.google.cloud.secretmanager.v1.ISecretVersion,
      protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest | undefined,
      {} | undefined,
    ]
  > {
    if (request.parent && request.payload && request.payload.data) {
      this.secrets.set(
        request.parent.split("?")[1],
        request.payload.data.toString(),
      );
      return ([request.payload.data.toString()] as unknown) as Promise<
        [
          protos.google.cloud.secretmanager.v1.ISecretVersion,
          (
            | protos.google.cloud.secretmanager.v1.IAddSecretVersionRequest
            | undefined
          ),
          {} | undefined,
        ]
      >;
    } else {
      throw new Error(
        "Incomplete request. Required request.parent, request.payload.data",
      );
    }
  }

  deleteSecret(
    request: protos.google.cloud.secretmanager.v1.IDeleteSecretRequest,
  ): Promise<
    [
      protos.google.protobuf.IEmpty,
      protos.google.cloud.secretmanager.v1.IDeleteSecretRequest | undefined,
      {} | undefined,
    ]
  > {
    if (request.name) {
      this.secrets.delete(request.name.split("?")[1]);
    } else {
      throw new Error("request.name not passed");
    }
    return (undefined as unknown) as Promise<
      [
        protos.google.protobuf.IEmpty,
        protos.google.cloud.secretmanager.v1.IDeleteSecretRequest | undefined,
        {} | undefined,
      ]
    >;
  }

  accessSecretVersion(
    request: protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest,
  ): Promise<
    [
      protos.google.cloud.secretmanager.v1.IAccessSecretVersionResponse,
      (
        | protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest
        | undefined
      ),
      {} | undefined,
    ]
  > {
    const result = this.secrets.has(request.name?.split("?")[1] || "");
    if (result) {
      return (true as unknown) as Promise<
        [
          protos.google.cloud.secretmanager.v1.IAccessSecretVersionResponse,
          (
            | protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest
            | undefined
          ),
          {} | undefined,
        ]
      >;
    } else {
      return (false as unknown) as Promise<
        [
          protos.google.cloud.secretmanager.v1.IAccessSecretVersionResponse,
          (
            | protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest
            | undefined
          ),
          {} | undefined,
        ]
      >;
    }
  }

  getSecret(
    request: protos.google.cloud.secretmanager.v1.IGetSecretRequest,
  ): Promise<
    [
      protos.google.cloud.secretmanager.v1.ISecret,
      protos.google.cloud.secretmanager.v1.IGetSecretRequest | undefined,
      {} | undefined,
    ]
  > {
    const result = this.secrets.get(request.name?.split("?")[1] || "");
    if (result) {
      return ([result] as unknown) as Promise<
        [
          protos.google.cloud.secretmanager.v1.ISecret,
          protos.google.cloud.secretmanager.v1.IGetSecretRequest | undefined,
          {} | undefined,
        ]
      >;
    } else {
      throw new Error(`${request.name || ""} secret not found.`);
    }
  }
}
