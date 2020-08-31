/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * VerifierBase.ts
 */

import { Verifier, ApiInfo, LedgerEvent, VerifierEventListener } from './LedgerPlugin'
import { json2str, addSocket, getStoredSocket, deleteAndDisconnectSocke } from './DriverCommon'
import { LedgerOperation } from './../business-logic-plugin/LedgerOperation';
import { Socket } from 'dgram';

const io = require('socket.io-client');

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'VerifierBase';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class VerifierBase implements Verifier {
    validatorUrl: string = "";
    eventListener: VerifierEventListener | null = null; // Listener for events from Ledger

    constructor(ledgerInfo: string) {
        // TODO: Configure the Verifier based on the connection information
        const ledgerInfoObj: {} = JSON.parse(ledgerInfo);
        this.validatorUrl = ledgerInfoObj['validatorURL'];
    }

    // BLP -> Verifier
    getApiList(): ApiInfo[] {
        logger.debug('call : super.getApiList');
        return;
    };

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
                const eventListener = this.eventListener;
                const className = this.constructor.name;

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

                    if (eventListener != null) {
                        const eventFilter = eventListener.getEventFilter();

                        const event = new LedgerEvent();
                        event.verifierId = className;
                        event.data = res;

                        logger.debug(`####call eventListener.isTargetEvent()`);
                        if (eventListener.isTargetEvent(event)) {
                            logger.debug(`##call eventListener, eventListener: ${eventListener}`);
                            eventListener.onEvent(event);
                            logger.debug(`##called eventListener`);
                        }
                        else {
                            logger.warn(`##skip eventListener, not target event.`);
                        }
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

    static isTargetEvent(filter: object, event: object): boolean {
        // NOTE: Filter only supports txid
        if (filter == null) {
            logger.warn(`eventFilter: null.`);
            return true;
        }

        if (!filter.hasOwnProperty('txId')) {
            logger.warn(`eventFilter: not exist txId.`);
            return true;
        }

        if (!filter.hasOwnProperty('getTxIdFromEvent')) {
            logger.warn(`eventFilter: not exist getTxIdFromEvent.`);
            return true;
        }

        // Judgment of the filter condition
        const filterTxId = filter['txId'];
        const eventTxId = filter['getTxIdFromEvent'](event);
        const result = (eventTxId === filterTxId);
        // logger.debug(`####filterIxId: ${filterTxId}, eventTxId: ${eventTxId}, result: ${result}`);
        return result;
    }

    setEventListener(eventListener: VerifierEventListener | null): void {
        logger.debug(`##call : super.setEventListener`);
        this.eventListener = eventListener;
        return;
    };

    // Validator -> Verifier
    // NOTE: The following methods are not implemented this time
    // connect(): void;
    // disconnect(): void;
    // getVerifierInfo(): VerifierInfo[];
}