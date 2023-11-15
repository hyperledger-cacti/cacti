/**
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * @cactus-api-client/socketio-api-client.ts
 */

const defaultMaxCounterRequestID = 100;
const defaultSyncFunctionTimeoutMillisecond = 5 * 1000; // 5 seconds

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { ISocketApiClient } from "@hyperledger/cactus-core-api";

import { Socket, SocketOptions, ManagerOptions, io } from "socket.io-client-fixed-types";
import { readFileSync } from "fs";
import { resolve as resolvePath } from "path";
import {
  verify,
  VerifyOptions,
  VerifyErrors,
  JwtPayload,
  Algorithm,
} from "jsonwebtoken";
import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";

const supportedJwtAlgos: Algorithm[] = [
  "ES256",
  "ES384",
  "ES512",
  "RS256",
  "RS384",
  "RS512",
];

/**
 * Default logic for validating responses from socketio connector (validator).
 * Assumes that message is JWT signed with validator private key.
 * @param publicKey - Validator public key.
 * @param targetData - Signed JWT message to be decoded.
 * @returns Promise resolving to decoded JwtPayload.
 */
export function verifyValidatorJwt(
  publicKey: string,
  targetData: string,
): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    const option: VerifyOptions = {
      algorithms: supportedJwtAlgos,
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: FIXME https://github.com/hyperledger/cacti/issues/2523
    verify(
      targetData,
      publicKey,
      option,
      (err: VerifyErrors | null, decoded: JwtPayload | undefined) => {
        if (err) {
          reject(err);
        } else if (decoded === undefined) {
          reject(Error("Decoded message is undefined"));
        } else {
          resolve(decoded);
        }
      },
    );
  });
}

/**
 * Input parameters for SocketIOApiClient construction.
 */
export type SocketIOApiClientOptions = {
  readonly validatorID: string;
  readonly validatorURL: string;
  readonly validatorKeyValue?: string;
  readonly validatorKeyPath?: string;
  readonly logLevel?: LogLevelDesc;
  readonly maxCounterRequestID?: number;
  readonly syncFunctionTimeoutMillisecond?: number;
  readonly socketOptions?: Partial<ManagerOptions & SocketOptions>;
};

/**
 * Type of the message emitted from ledger monitoring.
 */
export type SocketLedgerEvent = {
  status: number;
  blockData: [Record<string, unknown>];
};

/**
 * Client for sending requests to some socketio ledger connectors (validators) using socketio protocol.
 *
 * @todo Analyze and handle broken connection / socket disconnected scenarios
 */
export class SocketIOApiClient implements ISocketApiClient<SocketLedgerEvent> {
  private readonly log: Logger;
  private readonly socket: Socket;
  private readonly validatorKey: string;

  // @todo - Why replay only last one? Maybe make it configurable?
  private monitorSubject: ReplaySubject<SocketLedgerEvent> | undefined;

  readonly className: string;
  counterReqID = 1;
  checkValidator: (publicKey: string, data: string) => Promise<JwtPayload> =
    verifyValidatorJwt;

  /**
   * @param validatorID - (required) ID of validator.
   * @param validatorURL - (required) URL to validator socketio endpoint.
   * @param validatorKeyValue - (required if no validatorKeyPath) Validator public key.
   * @param validatorKeyPath - (required if no validatorKeyValue) Path to validator public key in local storage.
   */
  constructor(public readonly options: SocketIOApiClientOptions) {
    this.className = this.constructor.name;

    Checks.nonBlankString(
      options.validatorID,
      `${this.className}::constructor() validatorID`,
    );
    Checks.nonBlankString(
      options.validatorURL,
      `${this.className}::constructor() validatorURL`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    if (options.validatorKeyValue) {
      this.validatorKey = options.validatorKeyValue;
    } else if (options.validatorKeyPath) {
      this.validatorKey = readFileSync(
        resolvePath(__dirname, options.validatorKeyPath),
        "ascii",
      );
    } else {
      throw new Error(
        "Either validatorKeyValue or validatorKeyPath must be defined",
      );
    }

    this.log.info(
      `Created ApiClient for Validator ID: ${options.validatorID}, URL ${options.validatorURL}, KeyPath ${options.validatorKeyPath}`,
    );
    this.log.debug("socketOptions:", options.socketOptions);

    this.socket = io(options.validatorURL, options.socketOptions);
  }

  /**
   * Immediately sends request to the validator, doesn't report any error or responses.
   * @param contract - contract to execute on the ledger.
   * @param method - function / method to be executed by validator.
   * @param args - arguments.
   */
  public sendAsyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: any,
  ): void {
    try {
      const requestData = {
        contract: contract,
        method: method,
        args: args,
      };

      this.log.debug("sendAsyncRequest() Request:", requestData);
      this.socket.emit("request2", requestData);
    } catch (err) {
      this.log.error("sendAsyncRequest() EXCEPTION", err);
      throw err;
    }
  }

  /**
   * Sends request to be executed on the ledger, watches and reports any error and the response from a ledger.
   * @param contract - contract to execute on the ledger.
   * @param method - function / method to be executed by validator.
   * @param args - arguments.
   * @returns Promise that will resolve with response from the ledger, or reject when error occurred.
   * @todo Refactor to RxJS
   */
  public sendSyncRequest(
    contract: Record<string, unknown>,
    method: Record<string, unknown>,
    args: any,
  ): Promise<any> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const freeableListeners = new Map<string, (...args: any[]) => void>();

    return new Promise((resolve, reject) => {
      this.log.debug("call : sendSyncRequest");

      try {
        this.log.debug(
          "##in sendSyncRequest, contract:",
          contract,
          "method:",
          method,
          "args:",
          args,
        );
        let responseFlag = false;

        // reqID generation
        const reqID = this.genarateReqID();
        this.log.debug(`##sendSyncRequest, reqID = ${reqID}`);

        const connectErrorHandler = (err: Error) => {
          this.log.error("##connect_error:", err);
          this.socket.disconnect();
          reject(err);
        };
        this.socket.on("connect_error", connectErrorHandler);
        freeableListeners.set("connect_error", connectErrorHandler);

        const connectTimeoutHandler = (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          reject(err);
        };
        this.socket.on("connect_timeout", connectTimeoutHandler);
        freeableListeners.set("connect_timeout", connectTimeoutHandler);

        const errorHandler = (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          reject(err);
        };
        this.socket.on("error", errorHandler);
        freeableListeners.set("error", errorHandler);

        const responseHandler = (result: any) => {
          this.log.debug("#[recv]response, res:", result);
          if (reqID === result.id) {
            responseFlag = true;

            if (typeof result.resObj.data !== "string") {
              this.log.debug(
                "Response data is probably not encrypted. resultObj =",
                result.resObj,
              );
              resolve(result.resObj);
            } else {
              this.checkValidator(this.validatorKey, result.resObj.data)
                .then((decodedData) => {
                  this.log.debug("checkValidator decodedData:", decodedData);
                  const resultObj = {
                    status: result.resObj.status,
                    data: decodedData.result,
                  };
                  this.log.debug("resultObj =", resultObj);
                  // Result reply
                  resolve(resultObj);
                })
                .catch((err) => {
                  responseFlag = false;
                  this.log.error("checkValidator error:", err);
                  reject({
                    status: 504,
                    error: err,
                  });
                });
            }
          }
        };
        this.socket.on("response", responseHandler);
        freeableListeners.set("response", responseHandler);

        // Call Validator
        const requestData = {
          contract: contract,
          method: method,
          args: args,
          reqID: reqID,
        };
        this.log.debug("requestData:", requestData);
        this.socket.emit("request2", requestData);
        this.log.debug("set timeout");

        // Time-out setting
        const timeoutMilliseconds =
          this.options.syncFunctionTimeoutMillisecond ||
          defaultSyncFunctionTimeoutMillisecond;
        timeout = setTimeout(() => {
          if (responseFlag === false) {
            this.log.debug("requestTimeout reqID:", reqID);
            resolve({ status: 504 });
          }
        }, timeoutMilliseconds);
      } catch (err) {
        this.log.error("##Error: sendSyncRequest:", err);
        reject(err);
      }
    }).finally(() => {
      freeableListeners.forEach((listener, eventName) =>
        this.socket.off(eventName, listener),
      );
      if (timeout) {
        clearTimeout(timeout);
      }
    });
  }

  /**
   * Start monitoring for new blocks on the ledger associated with given connector.
   * @param monitorOptions - Options to be passed to validator `startMonitoring` procedure.
   * @returns RxJs Observable, `next` - new block, `error` - any error from the validator.
   */
  public watchBlocksV1(
    monitorOptions?: Record<string, unknown>,
  ): Observable<SocketLedgerEvent> {
    if (this.monitorSubject) {
      this.log.debug("Reuse observable subject from previous call...");
      if (monitorOptions) {
        this.log.info(
          "Passed monitorOptions will be ignored since monitoring is already in progress!",
        );
      }
      return this.monitorSubject;
    } else {
      this.log.debug("Create new observable subject...");

      const freeableListeners = new Map<string, (...args: any[]) => void>();
      const freeListeners = () =>
        freeableListeners.forEach((listener, eventName) =>
          this.socket.off(eventName, listener),
        );

      this.monitorSubject = new ReplaySubject<SocketLedgerEvent>(0);

      this.log.debug("call : startMonitor");
      try {
        this.log.debug(
          `##in startMonitor, validatorUrl = ${this.options.validatorURL}`,
        );

        const connectErrorHandler = (err: Error) => {
          this.log.error("##connect_error:", err);
          this.socket.disconnect();
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        };
        this.socket.on("connect_error", connectErrorHandler);
        freeableListeners.set("connect_error", connectErrorHandler);

        const connectTimeoutHandler = (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        };
        this.socket.on("connect_timeout", connectTimeoutHandler);
        freeableListeners.set("connect_timeout", connectTimeoutHandler);

        const errorHandler = (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        };
        this.socket.on("error", errorHandler);
        freeableListeners.set("error", errorHandler);

        const monitorErrorHandler = (err: Record<string, unknown>) => {
          this.log.error("#### Monitor Error:", err);
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        };
        this.socket.on("monitor_error", monitorErrorHandler);
        freeableListeners.set("monitor_error", monitorErrorHandler);

        const eventReceivedHandler = (res: any) => {
          // output the data received from the client
          this.log.debug("#[recv]eventReceived, res:", res);

          this.checkValidator(this.validatorKey, res.blockData)
            .then((decodedData) => {
              const resultObj = {
                status: res.status,
                blockData: decodedData.blockData,
              };
              this.log.debug("resultObj=", resultObj);
              if (this.monitorSubject) {
                this.monitorSubject.next(resultObj);
              }
            })
            .catch((err) => {
              this.log.error(err);
            });
        };
        this.socket.on("eventReceived", eventReceivedHandler);
        freeableListeners.set("eventReceived", eventReceivedHandler);

        const emitStartMonitor = () => {
          this.log.debug("##emit: startMonitor");
          if (!monitorOptions || Object.keys(monitorOptions).length === 0) {
            this.socket.emit("startMonitor");
          } else {
            this.socket.emit("startMonitor", monitorOptions);
          }
        };

        if (this.socket.connected) {
          emitStartMonitor();
        } else {
          const connectHandler = () => {
            this.log.debug("#connect");
            emitStartMonitor();
          };
          this.socket.on("connect", connectHandler);
          freeableListeners.set("connect", connectHandler);
        }

        return this.monitorSubject.pipe(
          finalize(() => {
            if (this.monitorSubject && !this.monitorSubject.observed) {
              // Last observer finished
              this.log.debug("##emit: stopMonitor");
              this.socket.emit("stopMonitor");
              freeListeners();
              this.monitorSubject = undefined;
            }
          }),
        );
      } catch (err) {
        this.log.error(`##Error: startMonitor, ${err}`);
        freeListeners();
        this.monitorSubject.error(err);
      }
    }

    return this.monitorSubject;
  }

  /**
   * Generated sync request id used to track and match responses from the validator.
   * @returns ID lower than maxCounterRequestID.
   */
  private genarateReqID(): string {
    const maxCounterRequestID =
      this.options.maxCounterRequestID || defaultMaxCounterRequestID;
    if (this.counterReqID > maxCounterRequestID) {
      // Counter initialization
      this.counterReqID = 1;
    }
    return `${this.options.validatorID}_${this.counterReqID++}`;
  }

  /**
   * Closes internal socket.io connection to the validator.
   */
  public close(): void {
    this.socket.close();
  }
}
