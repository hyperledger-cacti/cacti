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
const process = require("process");
import FabricClient from "fabric-client";
// IF declaration for fabric
import { getClientAndChannel, getSubmitterAndEnroll } from "./fabricaccess";
// config file
import {
  configRead,
  signMessageJwt,
} from "@hyperledger/cactus-cmd-socketio-server";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = configRead<string>("logLevel", "info");
// utility
import { safeStringifyException } from "@hyperledger/cactus-common";

export type MonitorCallback = (callback: {
  status: number;
  blockData?: string;
  errorDetail?: string;
}) => void;

/*
 * ServerMonitorPlugin
 * Server monitoring class definition
 */
export class ServerMonitorPlugin {
  _filterTable = new Map<string, FabricClient>();
  _eh?: FabricClient.ChannelEventHub;

  /*
   * startMonitor
   * Start monitoring
   * @param {string} clientId : Client ID of the monitoring start request source
   * @param {function} cb : Callback function that receives the monitoring result at any time
   * @note Always listens on the first peer from config.
   */
  startMonitor(clientId: string, cb: MonitorCallback) {
    logger.info("*** START MONITOR ***");
    logger.info("Client ID :" + clientId);
    const filter = this._filterTable.get(clientId);
    let channel: FabricClient.Channel;

    if (!filter) {
      getClientAndChannel()
        .then((retobj) => {
          channel = retobj.channel; //Set the returned channel
          this._filterTable.set(clientId, retobj.client);
          return getSubmitterAndEnroll(retobj.client);
        })
        .then(() => {
          this._eh = channel.newChannelEventHub(
            channel.getPeers()[0].getPeer(),
          );
          logger.info("Connecting the event hub");
          this._eh.registerBlockEvent(
            (block) => {
              const txlist = [];
              logger.info("*** Block Event ***");

              if (!("header" in block && "data" in block)) {
                logger.warn(
                  "Invalid block type fromregisterBlockEvent - expected FabricClient.Block",
                );
                return;
              }

              console.log("##[HL-BC] Notify new block data(D2)");
              logger.info(
                "chain id :" + configRead<string>("fabric.channelName"),
              );
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
                  if (ccid == configRead<string>("fabric.chaincodeId")) {
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
              const signedTxlist = signMessageJwt({
                blockData: txlist,
              });
              logger.debug(`signedTxlist = ${signedTxlist}`);
              const retObj = {
                status: 200,
                blockData: signedTxlist,
              };
              cb(retObj);
            },
            (err) => {
              logger.warn(`Monitor error for client ${clientId} - `, err);
            },
          );
          this._eh.connect(true); //fullBlock=true
        })
        .catch((err) => {
          logger.error(err);
          const errObj = {
            status: 504,
            errorDetail: safeStringifyException(err),
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
  stopMonitor(clientId: string) {
    const filter = this._filterTable.get(clientId);

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
      this._filterTable.delete(clientId);
    }
  }
}
