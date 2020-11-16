/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierBase.ts
 */

import { Verifier, ApiInfo, LedgerEvent, VerifierEventListener } from './LedgerPlugin'
import { makeApiInfoList } from './DriverCommon'
import { json2str, addSocket, getStoredSocket, deleteAndDisconnectSocke } from './DriverCommon'
import { LedgerOperation } from './../business-logic-plugin/LedgerOperation';
import { Socket } from 'dgram';
import { ConfigUtil } from '../routing-interface/util/ConfigUtil';

const io = require('socket.io-client');

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'VerifierBase';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class VerifierBase implements Verifier {
    validatorID: string = "";
    validatorUrl: string = "";
    apiInfo: {} = null;
    counterReqID: number = 1;
    eventListener: VerifierEventListener | null = null; // Listener for events from Ledger

    constructor(ledgerInfo: string) {
        // TODO: Configure the Verifier based on the connection information
        const ledgerInfoObj: {} = JSON.parse(ledgerInfo);
        this.validatorID = ledgerInfoObj['validatorID'];
        this.validatorUrl = ledgerInfoObj['validatorURL'];
        this.apiInfo = ledgerInfoObj['apiInfo'];
    }

    // BLP -> Verifier
    getApiList(): ApiInfo[] {
        logger.debug('call : super.getApiList');
        // Returns API information available for requestLedgerOperation.
        return makeApiInfoList(this.apiInfo);
    };

    // NOTE: This function will be deleted due to the updating of API functions
    requestLedgerOperation(param: LedgerOperation): void {
        logger.debug('call : requestLedgerOperation');
        try {
            const apiType: string = param.apiType;
            const progress: string = param.progress;
            const data: {} = param.data;

            const socketOptions: {} = {
                rejectUnauthorized: config.socketOptions.rejectUnauthorized, // temporary avoidance since self-signed certificates are used
                reconnection: config.socketOptions.reconnection,
                timeout: config.socketOptions.timeout,
            };
            logger.debug(`socketOptions = ${JSON.stringify(socketOptions)}`);
            const socket: Socket = io(this.validatorUrl, socketOptions);

            const requestData: {} = {
                func: apiType,
                args: data
            };
            // logger.debug('requestData : ' + JSON.stringify(requestData));
            socket.emit('request', requestData);
        } catch (err) {
            logger.error('requestLedgerOperation faild : ' + err);
            throw err;
        }
    };
    
    execSyncFunction(param: LedgerOperation): Promise<any> {
        return new Promise((resolve, reject) => {
            logger.debug('call : execSyncFunction');
            try {
                logger.debug(`##in execSyncFunction, LedgerOperation = ${JSON.stringify(param)}`);
                let responseFlag: boolean = false;
                
                const reqID = this.genarateReqID();
                logger.debug(`##execSyncFunction, reqID = ${reqID}`);
                
                const socketOptions: {} = {
                    rejectUnauthorized: config.socketOptions.rejectUnauthorized,
                    reconnection: config.socketOptions.reconnection,
                    timeout: config.socketOptions.timeout,
                };
                logger.debug(`socketOptions = ${JSON.stringify(socketOptions)}`);
                const socket: Socket = io(this.validatorUrl, socketOptions);
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
                    logger.debug("#[recv]response, res: " + json2str(result));
                    if (reqID === result.id) {
                        responseFlag = true;
                        logger.debug(`##execSyncFunction: resObj: ${JSON.stringify(result.resObj)}`);
                        resolve(result.resObj);
                    }
                });

                const apiType: string = param.apiType;
                //const progress: string = param.progress;
                let data: {} = param.data;
                data["reqID"] = reqID;
                const requestData: {} = {
                    func: apiType,
                    args: data
                };
                logger.debug('requestData : ' + JSON.stringify(requestData));
                socket.emit('request', requestData);
                logger.debug('set timeout');
                
                setTimeout(() => {
                    if (responseFlag === false) {
                        logger.debug('requestTimeout reqID : ' + reqID);
                        resolve({"status":504, "amount":0});
                    }
                }, config.verifier.syncFunctionTimeoutMillisecond);
            }
            catch (err) {
                logger.error(`##Error: execSyncFunction, ${err}`);
                reject(err);
            }
        });
    }

    startMonitor(): Promise<LedgerEvent> {
        return new Promise((resolve, reject) => {
            logger.debug('call : startMonitor');
            // NOTE: Start the event monitor for the Validator and enable event reception.
            try {
                logger.debug(`##in startMonitor, validatorUrl = ${this.validatorUrl}`);

                const socketOptions: {} = {
                    rejectUnauthorized: config.socketOptions.rejectUnauthorized, // temporary avoidance since self-signed certificates are used
                    reconnection: config.socketOptions.reconnection,
                    timeout: config.socketOptions.timeout,
                };
                logger.debug(`socketOptions = ${JSON.stringify(socketOptions)}`);
                const socket: Socket = io(this.validatorUrl, socketOptions);

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

                socket.on("eventReceived", (res: any) => {
                    // output the data received from the client
                    logger.debug("#[recv]eventReceived, res: " + json2str(res));

                    logger.debug(`##set eventListener: ${this.eventListener}, ${this.constructor.name}, ${this.validatorID}`);
                    const eventListener = this.eventListener;

                    if (eventListener != null) {
                        // const eventFilter = eventListener.getEventFilter();

                        const event = new LedgerEvent();
                        event.verifierId = this.validatorID;
                        event.data = res;

                        eventListener.onEvent(event);
                    }
                    else {
                        logger.warn(`##skip eventListener`);
                        logger.warn(`##eventListener: ${eventListener}`);
                    }
                });

                socket.on("connect", () => {
                    logger.debug("#connect");
                    // save socket
                    const sIndex: number = addSocket(socket);
                    logger.debug("##emit: startMonitor");
                    socket.emit('startMonitor')
                    const ledgerEvent: LedgerEvent = new LedgerEvent();
                    ledgerEvent.id = String(sIndex);
                    logger.debug(`##startMonitor, ledgerEvent.id = ${ledgerEvent.id}`);
                    resolve(ledgerEvent);
                });
            }
            catch (err) {
                logger.error(`##Error: startMonitor, ${err}`);
                reject(err);
            }
        });
    }

    stopMonitor(soketId: string): void {
        logger.debug(`##call : stopMonitor, soketId = ${soketId}`);
        // NOTE: Stop the Validator event monitor.
        try {
            const socketIndex: number = parseInt(soketId, 10);
            if (socketIndex < 0) {
                logger.debug(`##stopMonitor: invalid socketIndex = ${socketIndex}`);
                return;
            }
            const socket: Socket = getStoredSocket(socketIndex);
            socket.emit('stopMonitor')
            setTimeout(() => {
                logger.debug(`##call deleteAndDisconnectSocke, socketIndex = ${socketIndex}`);
                deleteAndDisconnectSocke(socketIndex);
            }, 3000);
        }
        catch (err) {
            logger.error(`##Error: stopMonitor, ${err}`);
            return
        }
    }

    setEventListener(eventListener: VerifierEventListener | null): void {
        logger.debug(`##call : super.setEventListener`);
        this.eventListener = eventListener;
        return;
    };
    
    genarateReqID(): string {
        if (this.counterReqID > config.verifier.maxCounterRequestID) {
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