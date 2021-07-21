/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServerMonitorPlugin.js
 */

/*
 * Summary:
 * Monitoring class of connection destination dependent part of linkage server
 * Used when performing continuous monitoring.
 * Processing that ends with reception of a single event is supported by implementing a unique function in ServerPlugin.
 * Unlike ServerPlugin, it does not basically handle its own functions.
 */

// Basic package dependency declaration
import process from "process";
import fs from "fs";
import path from "path";
// IF declaration for fabric
import { getSubmitter, getClientAndChannel } from "./fabricaccess";

// const sdk = require("./fabricaccess.js");
// config file
import { SplugConfig } from "./PluginConfig";
import { config } from "../core/config/default";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = config.logLevel;
// utility
import { ValidatorAuthentication } from "../../../../ValidatorAuthentication";

const privateKeyB64 = fs.readFileSync(
  path.resolve(__dirname, config.validatorKeyPath),
  "base64",
);

/*
 * ServerMonitorPlugin
 * Server monitoring class definition
 */
export class ServerMonitorPlugin {
  _filterTable: any;
  _network: any;
  _eh: any;

  constructor() {
    // Define settings specific to the dependent part
    // Initializing filter during monitoring
    this._filterTable = {};
    this._network = SplugConfig; //channelID, mspid, peer settings, etc.
    this._eh = null;
  }

  /*
   * startMonitor
   * Start monitoring
   * @param {string} clientId : Client ID of the monitoring start request source
   * @param {function} cb : Callback function that receives the monitoring result at any time
   */
  startMonitor(clientId: any, cb: any) {
    logger.info("*** START MONITOR ***");
    logger.info("Client ID :" + clientId);
    const filter = this._filterTable[clientId];
    const network = this._network;
    let channel: any = null;

    const validatorAuthentication = new ValidatorAuthentication({
      logLevel: config.logLevel,
      privateKeyB64,
    });

    if (!filter) {
      getClientAndChannel()
        .then((retobj: any) => {
          channel = retobj.channel; //Set the returned channel
          this._filterTable[clientId] = retobj.client;
          return getSubmitter(retobj.client);
        })
        .then(() => {
          const peer = this._filterTable[clientId].newPeer(
            network.fabric.peers[0].requests,
          );
          this._eh = channel.newChannelEventHub(peer);
          logger.info("Connecting the event hub");
          this._eh.registerBlockEvent((block: any) => {
            const txlist = [];
            logger.info("*** Block Event ***");
            console.log("##[HL-BC] Notify new block data(D2)");
            logger.info("chain id :" + network.fabric.channelName);
            logger.info("blocknumber : " + block.header.number);
            const len = block.data.data.length;
            logger.info("data.data.length :" + len);
            console.log("##[HL-BC] Validate transactions(D3)");
            console.log("##[HL-BC] digital sign on valid transaction(D4)");
            for (let i = 0; i < len; i++) {
              const payload = block.data.data[i].payload;
              const channel_header = payload.header.channel_header;
              if (channel_header.type == 3) {
                //'ENDORSER_TRANSACTION'
                const txid = channel_header.tx_id;
                logger.info("transaction id :" + txid);
                const transaction = payload.data;
                const actionPayload = transaction.actions[0].payload;
                const proposalPayload =
                  actionPayload.chaincode_proposal_payload;
                const invocationSpec = proposalPayload.input;
                // Can obtain chaincode name and argument list (function name at the beginning) from invocationSpec
                const ccid = invocationSpec.chaincode_spec.chaincode_id.name;
                logger.info("chaincode id :" + ccid);
                // Only notify transactions from the chaincode used in ServerPlugin
                if (ccid == network.fabric.chaincodeId) {
                  const args = invocationSpec.chaincode_spec.input.args;
                  logger.info("args.length :" + args.length);
                  for (let j = 0; j < args.length; j++) {
                    // code must be specified for toString
                    args[j] = args[j].toString("utf8");
                    logger.info("args[" + j + "] :" + args[j]);
                  }
                  const func = args[0];
                  args.shift();

                  // Interpretation of response
                  const resp =
                    actionPayload.action.proposal_response_payload.extension
                      .response.payload;
                  logger.info("resp :" + resp);

                  //The transaction data should include the following.
                  txlist.push({
                    chaincodeId: ccid,
                    txId: txid,
                    func: func,
                    args: args,
                  });
                }
              }
            }
            logger.info("*** SEND BLOCK DATA ***");
            logger.debug(`txlist = ${JSON.stringify(txlist)}`);
            const signedTxlist = validatorAuthentication.sign({
              blockData: txlist,
            });
            logger.debug(`signedTxlist = ${signedTxlist}`);
            const retObj = {
              status: 200,
              blockData: signedTxlist,
            };
            cb(retObj);
          });
          this._eh.connect(true); //fullBlock=true
        })
        .catch((err: unknown) => {
          logger.error(err);
          const errObj = {
            status: 504,
            errorDetail: err,
          };
          cb(errObj);
        });
    } else {
      logger.info("target filter has already start watching.");
    }
  }

  /*
   * stopMonitor
   * Stop monitoring
   * @param {string} clientId : Client ID of the monitoring stop request source
   */
  stopMonitor(clientId: any) {
    const filter = this._filterTable[clientId];

    if (filter) {
      // Stop filter & remove from table
      if (this._eh == null) {
        logger.error("EventHub does not exist");
        return;
      }
      if (this._eh.isconnected()) {
        logger.info("Disconnecting the event hub");
        this._eh.disconnect();
      }
      delete this._filterTable[clientId];
    }
  }
}
