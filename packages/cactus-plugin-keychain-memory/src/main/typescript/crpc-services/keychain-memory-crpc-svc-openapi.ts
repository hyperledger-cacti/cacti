import { ConnectError, Code, ServiceImpl } from "@connectrpc/connect";

import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
  Strings,
} from "@hyperledger/cactus-common";

import { PluginKeychainMemory } from "../plugin-keychain-memory";

import {
  DefaultService,
  GetPrometheusMetricsV1Response,
  GetPrometheusMetricsV1ResponseSchema,
} from "../generated/crpc/services/default_service_pb";

import {
  DeleteKeychainEntryResponseV1PB,
  DeleteKeychainEntryResponseV1PBSchema,
} from "../generated/crpc/models/delete_keychain_entry_response_v1_pb_pb";
import { DeleteKeychainEntryV1Request } from "../generated/crpc/services/default_service_pb";

import {
  GetKeychainEntryResponseV1PB,
  GetKeychainEntryResponseV1PBSchema,
} from "../generated/crpc/models/get_keychain_entry_response_v1_pb_pb";
import { GetKeychainEntryV1Request } from "../generated/crpc/services/default_service_pb";

import { HasKeychainEntryV1Request } from "../generated/crpc/services/default_service_pb";
import {
  HasKeychainEntryResponseV1PB,
  HasKeychainEntryResponseV1PBSchema,
} from "../generated/crpc/models/has_keychain_entry_response_v1_pb_pb";

import { SetKeychainEntryV1Request } from "../generated/crpc/services/default_service_pb";
import {
  SetKeychainEntryResponseV1PB,
  SetKeychainEntryResponseV1PBSchema,
} from "../generated/crpc/models/set_keychain_entry_response_v1_pb_pb";
import { create } from "@bufbuild/protobuf";

export interface IKeychainMemoryCrpcSvcOpenApiOptions {
  readonly logLevel?: LogLevelDesc;
  readonly keychain: PluginKeychainMemory;
}

export class KeychainMemoryCrpcSvcOpenApi
  implements ServiceImpl<typeof DefaultService>
{
  // We cannot avoid this due to how the types of the upstream library are
  // structured/designed hence we just disable the linter on this particular line.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;

  public static readonly CLASS_NAME = "KeychainMemoryCrpcSvcOpenApi";
  public readonly logLevel: LogLevelDesc;
  private readonly log: Logger;
  private readonly keychain: PluginKeychainMemory;

  constructor(readonly opts: IKeychainMemoryCrpcSvcOpenApiOptions) {
    this.logLevel = opts.logLevel ? opts.logLevel : "WARN";
    this.log = LoggerProvider.getOrCreate({
      level: this.logLevel,
      label: this.className,
    });
    if (!opts.keychain) {
      throw new Error("Expected truthy opts.keychain property");
    }
    if (!(opts.keychain instanceof PluginKeychainMemory)) {
      throw new Error("Need opts.keychain as instanceof PluginKeychainMemory");
    }
    this.keychain = opts.keychain;
  }

  public get className(): string {
    return KeychainMemoryCrpcSvcOpenApi.CLASS_NAME;
  }

  public async deleteKeychainEntryV1(
    req: DeleteKeychainEntryV1Request,
  ): Promise<DeleteKeychainEntryResponseV1PB> {
    const fn = "deleteKeychainEntryV1()";

    this.log.debug("%s ENTRY req=%o", fn, req);

    if (!req) {
      throw new ConnectError("Falsy request object.", Code.InvalidArgument);
    }
    if (!req.deleteKeychainEntryRequestV1PB) {
      throw new ConnectError(
        "req.deleteKeychainEntryRequestV1PB falsy.",
        Code.InvalidArgument,
      );
    }

    if (!req.deleteKeychainEntryRequestV1PB.key) {
      throw new ConnectError(
        "req.deleteKeychainEntryRequestV1PB.key falsy.",
        Code.InvalidArgument,
      );
    }

    if (!Strings.isNonBlank(req.deleteKeychainEntryRequestV1PB.key)) {
      throw new ConnectError(
        "req.deleteKeychainEntryRequestV1PB.key wasn't non-blank string.",
        Code.InvalidArgument,
      );
    }

    const key = req.deleteKeychainEntryRequestV1PB.key;
    await this.keychain.delete(key);
    this.log.debug("%s Deleted value for key=%s", fn, key);

    const res = create(DeleteKeychainEntryResponseV1PBSchema, {
      key,
    });
    this.log.debug("%s EXIT res=%o", fn, res);
    return res;
  }

  public async getKeychainEntryV1(
    req: GetKeychainEntryV1Request,
  ): Promise<GetKeychainEntryResponseV1PB> {
    const fn = "getKeychainEntryV1()";

    this.log.debug("%s ENTRY req=%o", fn, req);

    if (!req) {
      throw new ConnectError("Falsy request object.", Code.InvalidArgument);
    }
    if (!req.getKeychainEntryRequestV1PB) {
      throw new ConnectError(
        "req.getKeychainEntryRequestV1PB falsy.",
        Code.InvalidArgument,
      );
    }

    if (!req.getKeychainEntryRequestV1PB.key) {
      throw new ConnectError(
        "req.getKeychainEntryRequestV1PB.key falsy.",
        Code.InvalidArgument,
      );
    }

    if (!Strings.isNonBlank(req.getKeychainEntryRequestV1PB.key)) {
      throw new ConnectError(
        "req.getKeychainEntryRequestV1PB.key wasn't non-blank string.",
        Code.InvalidArgument,
      );
    }

    const key = req.getKeychainEntryRequestV1PB.key;
    const value = await this.keychain.get(key);
    this.log.debug("%s Got value=%s for key=%s", fn, value, key);

    const res = create(GetKeychainEntryResponseV1PBSchema, { key, value });
    this.log.debug("%s EXIT res=%o", fn, res);
    return res;
  }

  public async getPrometheusMetricsV1(): Promise<GetPrometheusMetricsV1Response> {
    return create(GetPrometheusMetricsV1ResponseSchema, {});
  }

  public async hasKeychainEntryV1(
    req: HasKeychainEntryV1Request,
  ): Promise<HasKeychainEntryResponseV1PB> {
    const fn = "hasKeychainEntryV1()";

    this.log.debug("%s ENTRY req=%o", fn, req);

    if (!req) {
      throw new ConnectError("Falsy request object.", Code.InvalidArgument);
    }
    if (!req.hasKeychainEntryRequestV1PB) {
      throw new ConnectError(
        "req.hasKeychainEntryRequestV1PB falsy.",
        Code.InvalidArgument,
      );
    }

    if (!req.hasKeychainEntryRequestV1PB.key) {
      throw new ConnectError(
        "req.hasKeychainEntryRequestV1PB.key falsy.",
        Code.InvalidArgument,
      );
    }

    if (!Strings.isNonBlank(req.hasKeychainEntryRequestV1PB.key)) {
      throw new ConnectError(
        "req.hasKeychainEntryRequestV1PB.key wasn't non-blank string.",
        Code.InvalidArgument,
      );
    }

    const key = req.hasKeychainEntryRequestV1PB.key;
    const isPresent = await this.keychain.has(key);
    const res = create(HasKeychainEntryResponseV1PBSchema, {
      checkedAt: new Date().toJSON(),
      isPresent,
      key,
    });
    this.log.debug("%s EXIT res=%o", fn, res);
    return res;
  }

  public async setKeychainEntryV1(
    req: SetKeychainEntryV1Request,
  ): Promise<SetKeychainEntryResponseV1PB> {
    const fn = "setKeychainEntryV1()";

    this.log.debug("%s ENTRY req=%o", fn, req);

    if (!req) {
      throw new ConnectError("Falsy request object.", Code.InvalidArgument);
    }
    if (!req.setKeychainEntryRequestV1PB) {
      throw new ConnectError(
        "req.setKeychainEntryRequestV1PB falsy.",
        Code.InvalidArgument,
      );
    }

    if (!req.setKeychainEntryRequestV1PB.key) {
      throw new ConnectError(
        "req.setKeychainEntryRequestV1PB.key falsy.",
        Code.InvalidArgument,
      );
    }

    if (!Strings.isNonBlank(req.setKeychainEntryRequestV1PB.key)) {
      throw new ConnectError(
        "req.setKeychainEntryRequestV1PB.key wasn't non-blank string.",
        Code.InvalidArgument,
      );
    }

    const key = req.setKeychainEntryRequestV1PB.key;
    const value = req.setKeychainEntryRequestV1PB.value;
    await this.keychain.set(key, value);
    const res = create(SetKeychainEntryResponseV1PBSchema, { key });
    this.log.debug("%s EXIT res=%o", fn, res);
    return res;
  }
}
