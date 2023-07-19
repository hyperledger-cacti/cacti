/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServerPlugin.js
 */

/*
 * Summary:
 * Connector: a part dependent on endchains
 * Define and implement the function according to the connection destination dependent part (ADAPTER) on the core side.
 */

// configuration file
const SplugUtil = require("./PluginUtil");
import * as config from "../common/core/config";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = config.read("logLevel", "info");
// utility
import { ValidatorAuthentication } from "./ValidatorAuthentication";
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

import https from "https";
import fs = require("fs");

export type MonitorCallback = (callback: {
    status: number;
    blockData: string;
}) => void;

/*
 * ServerPlugin
 * Class definition for server plugins
 */
export class ServerPlugin {
    /*
     * constructors
     */
    constructor() {
        // Define dependent specific settings
    }

    /*
     * isExistFunction
     *
     * @param {String} funcName: The function name to check.
     *
     * @return {Boolean} true: Yes./false: does not exist.
     *
     * @desc Return if end-chain specific funtion is implemented
     *       Scope of this function is in this class
     *       Functions that should not be called directly should be implemented outside this class like utilities.
     */
    isExistFunction(funcName: string) {
        if ((this as any)[funcName]) {
            return true;
        } else {
            return false;
        }
    }

    // Define an arbitrary function and implement it according to specifications of end-chains
    /*
     * getNumericBalance
     * Get numerical balance
     *
     * @param {Object} args JSON Object
     * {
     *      "referedAddress":<reference account>,
     *      "reqID":<request ID> (option)
     * }
     * @return {Object} JSON object
     */
    contract(args: any, cb: MonitorCallback) {
        const hostname: string = config.read("sendTransaction.requestOptions.host");
        const method: string = config.read("sendTransaction.requestOptions.method");
        const port: string = config.read("sendTransaction.requestOptions.port");
        const path: string = config.read("sendTransaction.requestOptions.path");
        const request_blocknum_body = JSON.stringify({
            "to_chaincode_id": args.contract,
            "to_query_func_name": args.method,
            "args": args.args,
            "cross_Chain": args.crossChain,
        });
        const options: https.RequestOptions = {
            hostname: hostname,
            port: port,
            path: path,
            method: method,
            headers: {
                "Content-Type": "text/plain",
                "Content-Length": Buffer.byteLength(request_blocknum_body),
            },
            cert: fs.readFileSync(config.read("sslParam.clientCert")),
            key: fs.readFileSync(config.read("sslParam.clientKey")),
            rejectUnauthorized: false,
        };

        let resData;
        const that = this;
        const req = https.request(options, (res) => {
            res.on("data", (d) => {
                resData = JSON.parse(d);
                console.log(resData);
                cb(resData);
            });
        });

        req.write(request_blocknum_body);

        req.on("error", (error) => {
            logger.error(error);
        });
        req.end();

    }
}
