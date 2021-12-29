/**
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * @cactus-api-client/socketio-api-client.ts
 */

const defaultMaxCounterRequestID = 100;
const defaultSyncFunctionTimeoutMillisecond = 5 * 1000; // 5 seconds

import { Logger, Checks } from "@hyperledger/cactus-common";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { ISocketApiClient } from "@hyperledger/cactus-core-api";

import { Socket, SocketOptions, ManagerOptions, io } from "socket.io-client";
import { readFile } from "fs";
import { resolve as resolvePath } from "path";
import { verify, VerifyOptions, VerifyErrors, JwtPayload } from "jsonwebtoken";
import { Observable, ReplaySubject } from "rxjs";
import { finalize } from "rxjs/operators";

/**
 * Default logic for validating responses from socketio connector (validator).
 * Assumes that message is JWT signed with validator private key.
 * @param keyPath - Absolute or relative path to validator public key.
 * @param targetData - Signed JWT message to be decoded.
 * @returns Promise resolving to decoded JwtPayload.
 */
export function verifyValidatorJwt(
  keyPath: string,
  targetData: string,
): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    readFile(
      resolvePath(__dirname, keyPath),
      (fileError: Error | null, publicKey: Buffer) => {
        if (fileError) {
          reject(fileError);
        }

        const option: VerifyOptions = {
          algorithms: ["ES256"],
        };

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
  readonly validatorKeyPath: string;
  readonly logLevel?: LogLevelDesc;
  readonly maxCounterRequestID?: number;
  readonly syncFunctionTimeoutMillisecond?: number;
  readonly socketOptions?: Partial<ManagerOptions & SocketOptions>;
};

/**
 * Type of the message emitted from ledger monitoring.
 */
export class SocketLedgerEvent {
  id = "";
  verifierId = "";
  data: Record<string, unknown> | null = null;
}

/**
 * Client for sending requests to some socketio ledger connectors (validators) using socketio protocol.
 *
 * @todo Analyze and handle broken connection / socket disconnected scenarios
 */
export class SocketIOApiClient implements ISocketApiClient<SocketLedgerEvent> {
  private readonly log: Logger;
  private readonly socket: Socket;
  // @todo - Why replay only last one? Maybe make it configurable?
  private monitorSubject: ReplaySubject<SocketLedgerEvent> | undefined;

  readonly className: string;
  counterReqID = 1;
  checkValidator: (
    key: string,
    data: string,
  ) => Promise<JwtPayload> = verifyValidatorJwt;

  /**
   * @param validatorID - (required) ID of validator.
   * @param validatorURL - (required) URL to validator socketio endpoint.
   * @param validatorKeyPath - (required) Path to validator public key in local storage.
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
    Checks.nonBlankString(
      // TODO - checks path exists?
      options.validatorKeyPath,
      `${this.className}::constructor() validatorKeyPath`,
    );

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

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

        this.socket.on("connect_error", (err: Error) => {
          this.log.error("##connect_error:", err);
          this.socket.disconnect();
          reject(err);
        });
        this.socket.on("connect_timeout", (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          reject(err);
        });
        this.socket.on("error", (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          reject(err);
        });
        this.socket.on("response", (result: any) => {
          this.log.debug("#[recv]response, res:", result);
          if (reqID === result.id) {
            responseFlag = true;

            this.checkValidator(
              this.options.validatorKeyPath,
              result.resObj.data,
            )
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
                this.log.debug("checkValidator error:", err);
                this.log.error(err);
              });
          }
        });

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
        setTimeout(() => {
          if (responseFlag === false) {
            this.log.debug("requestTimeout reqID:", reqID);
            resolve({ status: 504 });
          }
        }, timeoutMilliseconds);
      } catch (err) {
        this.log.error("##Error: sendSyncRequest:", err);
        reject(err);
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

      this.monitorSubject = new ReplaySubject<SocketLedgerEvent>(0);

      this.log.debug("call : startMonitor");
      try {
        this.log.debug(
          `##in startMonitor, validatorUrl = ${this.options.validatorURL}`,
        );

        this.socket.on("connect_error", (err: Error) => {
          this.log.error("##connect_error:", err);
          this.socket.disconnect();
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        });

        this.socket.on("connect_timeout", (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        });

        this.socket.on("error", (err: Record<string, unknown>) => {
          this.log.error("####Error:", err);
          this.socket.disconnect();
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        });

        this.socket.on("monitor_error", (err: Record<string, unknown>) => {
          this.log.error("#### Monitor Error:", err);
          if (this.monitorSubject) {
            this.monitorSubject.error(err);
          }
        });

        this.socket.on("eventReceived", (res: any) => {
          // output the data received from the client
          this.log.debug("#[recv]eventReceived, res:", res);

          this.checkValidator(this.options.validatorKeyPath, res.blockData)
            .then((decodedData) => {
              const resultObj = {
                status: res.status,
                blockData: decodedData.blockData,
              };
              this.log.debug("resultObj =", resultObj);
              const event = new SocketLedgerEvent();
              event.verifierId = this.options.validatorID;
              this.log.debug(`##event.verifierId: ${event.verifierId}`);
              event.data = resultObj;
              if (this.monitorSubject) {
                this.monitorSubject.next(event);
              }
            })
            .catch((err) => {
              this.log.error(err);
            });
        });

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
          this.socket.on("connect", () => {
            this.log.debug("#connect");
            emitStartMonitor();
          });
        }
      } catch (err) {
        this.log.error(`##Error: startMonitor, ${err}`);
        this.monitorSubject.error(err);
      }

      return this.monitorSubject.pipe(
        finalize(() => {
          if (this.monitorSubject && !this.monitorSubject.observed) {
            // Last observer finished
            this.log.debug("##emit: stopMonitor");
            this.socket.emit("stopMonitor");
            this.monitorSubject = undefined;
          }
        }),
      );
    }
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
}
