/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verifier.ts
 */

import {
  IVerifier,
  ApiInfo,
  LedgerEvent,
  VerifierEventListener,
} from "./LedgerPlugin";
import { json2str } from "./DriverCommon";
import { LedgerOperation } from "../business-logic-plugin/LedgerOperation";
import { LedgerPluginInfo } from "./validator-registry";
import { ConfigUtil } from "../routing-interface/util/ConfigUtil";
import { VerifierAuthentication } from "./VerifierAuthentication";
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

import { Socket, io } from "socket.io-client";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "Verifier";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const VALIDATOR_TYPE = {
  SOCKET: "socketio",
  OPENAPI: "openapi",
} as const;
type VALIDATOR_TYPE = typeof VALIDATOR_TYPE[keyof typeof VALIDATOR_TYPE]; // 'socketio' | 'openapi'

// abolish template-trade
// const validatorRregistryConf: any = yaml.safeLoad(fs.readFileSync("/etc/cactus/validator-registry.yaml", 'utf8'));

export class Verifier implements IVerifier {
  validatorID = "";
  validatorType = "";
  validatorUrl = "";
  validatorKeyPath = "";
  apiInfo: Array<ApiInfo> = [];
  counterReqID = 1;
  eventListenerHash: { [key: string]: VerifierEventListener } = {}; // Listeners for events from Ledger
  static mapUrlSocket: Map<string, Socket> = new Map();
  checkValidator: (key: string, data: string) => Promise<any> =
    VerifierAuthentication.verify;

  constructor(ledgerInfo: string) {
    // TODO: Configure the Verifier based on the connection information
    const ledgerInfoObj = JSON.parse(ledgerInfo) as LedgerPluginInfo;
    this.validatorID = ledgerInfoObj.validatorID;
    this.validatorType = ledgerInfoObj.validatorType;
    this.validatorUrl = ledgerInfoObj.validatorURL;
    this.validatorKeyPath = ledgerInfoObj.validatorKeyPath;
    this.apiInfo = ledgerInfoObj.apiInfo;

    if (VALIDATOR_TYPE.SOCKET === this.validatorType) {
      // create socket instance assosiated with validatorUrl if it has not created yet
      if (!Verifier.mapUrlSocket.has(this.validatorID)) {
        const socketOptions: {} = {
          rejectUnauthorized: config.socketOptions.rejectUnauthorized, // temporary avoidance since self-signed certificates are used
          reconnection: config.socketOptions.reconnection,
          timeout: config.socketOptions.timeout,
        };
        logger.debug(`socketOptions = ${JSON.stringify(socketOptions)}`);
        Verifier.mapUrlSocket.set(
          this.validatorID,
          io(this.validatorUrl, socketOptions),
        );
      }
    }
  }

  // NOTE: asynchronous command
  public sendAsyncRequest(
    contract: object,
    method: object,
    args: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug(
        `call: sendAsyncRequest, contract = ${JSON.stringify(
          contract,
        )}, method = ${JSON.stringify(method)}, args = ${args}`,
      );
      try {
        // verifier comunicate with socket
        if (VALIDATOR_TYPE.SOCKET === this.validatorType) {
          this.requestLedgerOperationNeo(contract, method, args);
          resolve();
          // verifier comunicate with http
        } else if (VALIDATOR_TYPE.OPENAPI === this.validatorType) {
          this.requestLedgerOperationHttp(
            contract,
            method,
            args as { args: any },
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              logger.error(err);
              reject(err);
            });
        } else {
          const emsg = `invalid validator type : ${this.validatorType}`;
          logger.error(emsg);
          const retObj = {
            resObj: {
              status: 504,
              errorDetail: emsg,
            },
          };
          reject(retObj);
        }
      } catch (err) {
        logger.error(err);
        reject(err);
      }
    });
  }

  // NOTE: asynchronous command (repaired version)
  // TODO: Method name confirmation
  private requestLedgerOperationNeo(
    contract: object,
    method: object,
    args: object,
  ): void {
    logger.debug("call : requestLedgerOperation");
    try {
      const socket = Verifier.mapUrlSocket.get(this.validatorID);
      if (socket === undefined) {
        throw Error(`No socket for validator with ID ${this.validatorID}`);
      }

      const requestData: {} = {
        contract: contract,
        method: method,
        args: args,
      };
      // logger.debug('requestData : ' + JSON.stringify(requestData));
      socket.emit("request2", requestData);
    } catch (err) {
      logger.error("requestLedgerOperation faild : " + err);
      throw err;
    }
  }

  // NOTE: Synchronous command (entrance)
  public sendSyncRequest(
    contract: object,
    method: object,
    args: object,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.debug("call : sendSyncRequest");
      try {
        logger.debug(
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
        logger.debug(`##sendSyncRequest, reqID = ${reqID}`);

        // Preparing socket
        const socket = Verifier.mapUrlSocket.get(this.validatorID);
        if (socket === undefined) {
          throw Error(`No socket for validator with ID ${this.validatorID}`);
        }

        socket.on("connect_error", (err: object) => {
          logger.error("##connect_error:", err);
          // end communication
          socket.disconnect();
          reject(err);
        });
        socket.on("connect_timeout", (err: object) => {
          logger.error("####Error:", err);
          // end communication
          socket.disconnect();
          reject(err);
        });
        socket.on("error", (err: object) => {
          logger.error("####Error:", err);
          socket.disconnect();
          reject(err);
        });
        socket.on("response", (result: any) => {
          logger.debug("#[recv]response, res:", result);
          if (reqID === result.id) {
            responseFlag = true;

            this.checkValidator(this.validatorKeyPath, result.resObj.data)
              .then((decodedData) => {
                const resultObj = {
                  status: result.resObj.status,
                  data: decodedData.result,
                };
                logger.debug("resultObj =", resultObj);
                // Result reply
                resolve(resultObj);
              })
              .catch((err) => {
                responseFlag = false;
                logger.error(err);
              });
          }
        });

        // Call Validator
        const requestData: {} = {
          contract: contract,
          method: method,
          args: args,
          reqID: reqID,
        };
        logger.debug("requestData:", requestData);
        socket.emit("request2", requestData);
        logger.debug("set timeout");

        // Time-out setting
        setTimeout(() => {
          if (responseFlag === false) {
            logger.debug("requestTimeout reqID:", reqID);
            resolve({ status: 504, amount: 0 });
          }
        }, config.verifier.syncFunctionTimeoutMillisecond);
      } catch (err) {
        logger.error("##Error: sendSyncRequest:", err);
        reject(err);
      }
    });
  }

  private requestLedgerOperationHttp(
    contract: object,
    method: object,
    args: { args: any },
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.debug(
          `##in requestLedgerOperationHttp, contract = ${JSON.stringify(
            contract,
          )}, method = ${JSON.stringify(method)}, args = ${JSON.stringify(
            args,
          )}`,
        );
        const eventListenerHash = this.eventListenerHash;
        const validatorID = this.validatorID;

        const httpReq = new XMLHttpRequest();
        httpReq.onload = function () {
          try {
            // TODO: responding in JSON format?
            logger.debug(`responseObj = ${httpReq.responseText}`);
            const responseObj = JSON.parse(httpReq.responseText);
            logger.debug(`responseObj = ${JSON.stringify(responseObj)}`);

            logger.debug(`##make event`);
            const event = Verifier.makeOpenApiEvent(responseObj, validatorID);
            logger.debug(`##event: ${JSON.stringify(event)}`);
            let eventListener = null;
            if (Object.keys(eventListenerHash).length > 0) {
              logger.debug(`##requestLedgerOperationHttp`);
              for (const key in eventListenerHash) {
                logger.debug(
                  `key : ${key}, eventListenerHash[key] : ${JSON.stringify(
                    eventListenerHash[key],
                  )}`,
                );
                eventListener = eventListenerHash[key];
                eventListener.onEvent(event);
              }
            } else {
              logger.debug(
                `##requestLedgerOperationHttp eventListener does not exist`,
              );
            }
            logger.debug(`##after onEvent()`);

            // resolve(responseObj);
          } catch (err) {
            logger.error(
              `##Error: requestLedgerOperationHttp#httpReq.onload, ${err}`,
            );
          }
        };
        httpReq.onerror = function () {
          logger.error(`##Error: requestLedgerOperationHttp#httpReq.onerror`);
        };

        logger.debug(`validatorUrl: ${this.validatorUrl}`);
        httpReq.open("POST", this.validatorUrl + (method as any).command);
        // httpReq.setRequestHeader('content-type', 'application/json');
        httpReq.setRequestHeader("Content-Type", "application/json");
        // httpReq.send(args['args']);
        logger.debug(`args['args']: ${JSON.stringify(args.args)}`);
        httpReq.send(JSON.stringify(args.args));

        resolve();
      } catch (err) {
        logger.error(`##Error: requestLedgerOperationHttp, ${err}`);
        reject(err);
      }
    });
  }

  static makeOpenApiEvent(resp: object, validatorID: string): LedgerEvent {
    logger.debug(`##in makeOpenApiEvent, resp = ${JSON.stringify(resp)}`);

    const event = new LedgerEvent();
    event.verifierId = validatorID;
    // TODO: for debug
    const txID = "openapi-txid-00001";
    event.data = { txId: txID, blockData: [resp] };
    logger.debug(`##event: ${JSON.stringify(event)}`);
    return event;
  }

  public startMonitor(
    id: string,
    options: Object,
    eventListener: VerifierEventListener,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug("call : startMonitor");
      try {
        this.setEventListener(id, eventListener);

        if (Object.keys(this.eventListenerHash).length > 0) {
          logger.debug(
            `##in startMonitor, validatorUrl = ${this.validatorUrl}`,
          );

          const socket = Verifier.mapUrlSocket.get(this.validatorID);
          if (socket === undefined) {
            throw Error(`No socket for validator with ID ${this.validatorID}`);
          }

          socket.on("connect_error", (err: object) => {
            logger.error("##connect_error:", err);
            // end communication
            socket.disconnect();
            reject(err);
          });

          socket.on("monitor_error", (err: object) => {
            logger.error("##monitor_error:", err);
            // end communication
            socket.disconnect();
            reject(err);
          });

          socket.on("connect_timeout", (err: object) => {
            logger.error("####Error:", err);
            // end communication
            socket.disconnect();
            reject(err);
          });

          socket.on("error", (err: object) => {
            logger.error("####Error:", err);
            socket.disconnect();
            reject(err);
          });

          socket.on("eventReceived", (res: any) => {
            // output the data received from the client
            logger.debug("#[recv]eventReceived, res: " + json2str(res));
            logger.debug(
              `##eventReceived Object.keys(this.eventListenerHash).length : ${
                Object.keys(this.eventListenerHash).length
              }`,
            );
            if (Object.keys(this.eventListenerHash).length > 0) {
              this.checkValidator(this.validatorKeyPath, res.blockData)
                .then((decodedData) => {
                  const resultObj = {
                    status: res.status,
                    blockData: decodedData.blockData,
                  };
                  logger.debug("resultObj =", resultObj);
                  const event = new LedgerEvent();
                  event.verifierId = this.validatorID;
                  logger.debug(`##event.verifierId: ${event.verifierId}`);
                  event.data = resultObj;
                  for (const key in this.eventListenerHash) {
                    const eventListener = this.eventListenerHash[key];
                    if (eventListener != null) {
                      logger.debug(
                        `##set eventListener: ${eventListener}, ${this.constructor.name}, ${this.validatorID}`,
                      );
                      eventListener.onEvent(event);
                    } else {
                      logger.warn(`##skip eventListener`);
                      logger.warn(`##eventListener key: ${key}`);
                      logger.warn(`##eventListener: ${eventListener}`);
                    }
                  }
                })
                .catch((err) => {
                  logger.error(err);
                });
            }
          });

          socket.on("connect", () => {
            logger.debug("#connect");
            logger.debug("##emit: startMonitor");
            if (Object.keys(this.eventListenerHash).length > 0) {
              if (Object.keys(options).length === 0) {
                socket.emit("startMonitor");
              } else {
                socket.emit("startMonitor", options);
              }
            }
          });
        }
      } catch (err) {
        logger.error(`##Error: startMonitor, ${err}`);
        reject(err);
      }
    });
  }

  public stopMonitor(id?: string): void {
    logger.debug(`##call : stopMonitor, id = ${id}`);
    try {
      if (id === undefined) {
        // if the id is not specified, delete all eventListeners
        for (const key in this.eventListenerHash) {
          delete this.eventListenerHash[key];
        }
      } else {
        // if the id is specified, delete eventListener defined by "id"
        delete this.eventListenerHash[id];
      }
      if (Object.keys(this.eventListenerHash).length === 0) {
        const socket = Verifier.mapUrlSocket.get(this.validatorID);
        if (socket === undefined) {
          throw Error(`No socket for validator with ID ${this.validatorID}`);
        }
        logger.debug("##emit: stopMonitor");
        socket.emit("stopMonitor");
      }
    } catch (err) {
      logger.error(`##Error: stopMonitor, ${err}`);
    }
  }

  private setEventListener(
    appId: string,
    eventListener: VerifierEventListener | null,
  ): void {
    logger.debug(`##call : setEventListener`);
    if (eventListener) {
      this.eventListenerHash[appId] = eventListener;
    }
    return;
  }

  // Request ID generation
  private genarateReqID(): string {
    if (this.counterReqID > config.verifier.maxCounterRequestID) {
      // Counter initialization
      this.counterReqID = 1;
    }
    return `${this.validatorID}_${this.counterReqID++}`;
  }

  // Validator -> Verifier
  // NOTE: The following methods are not implemented this time
  // connect(): void;
  // disconnect(): void;
  // getVerifierInfo(): VerifierInfo[];
}
