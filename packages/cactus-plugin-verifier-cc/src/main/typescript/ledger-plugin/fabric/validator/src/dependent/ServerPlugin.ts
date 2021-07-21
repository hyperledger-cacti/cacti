/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServerPlugin.js
 */

/*
 * Summary:
 * Dependent part of the connection destination of the connector
 * Define and implement the function independently according to the connection destination dependent part (adapter) on the core side.
 */

// config file
import { SplugConfig } from "./PluginConfig";
import { config } from "../core/config/default";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerPlugin[" + process.pid + "]");
logger.level = config.logLevel;
// utility
import { ValidatorAuthentication } from "../../../../ValidatorAuthentication";
// Read the library, SDK, etc. according to EC specifications as needed

import FabricClient from "fabric-client";
import copService from "fabric-ca-client";
import { FileSystemWallet, Gateway } from "fabric-network";
import path from "path";
import fs from "fs";
// const ccpPath = path.resolve(__dirname, "connection.json");
// const ccpJSON = fs.readFileSync(ccpPath, "utf8");
// const ccp = JSON.parse(ccpJSON);
import ccp from "./connection.json";
const walletPath = path.resolve(__dirname, "wallet");
const connUserName = SplugConfig.fabric.connUserName;

const privateKeyB64 = fs.readFileSync(
  path.resolve(__dirname, config.validatorKeyPath),
  "base64",
);

/*
 * ServerPlugin
 * ServerPlugin class definition
 */
export class ServerPlugin {
  /*
   * constructor
   */
  constructor() {
    // Define settings specific to the dependent part
  }

  /*
   * isExistFunction
   *
   * @param {String} funcName : The function name you want to determine.
   *
   * @return {Boolean} true : exist / false : not exist
   *
   * @desc Determines if the specified function exists in its class.
   *       Make sure that the support status of your class can be determined by your class.
   *       Functions that you do not want to call directly need to be devised such as implemented outside of this class like utilities.
   */
  isExistFunction(funcName: string): boolean {
    if ((this as any)[funcName] != undefined) {
      return true;
    } else {
      return false;
    }
  }

  /*
   * contractTransaction(Sync)
   *
   * @param {Object} args :  JSON Object
   * {
   *     "contract": {
   *         "channelName": <channel name>,
   *         "contractName": <contract name>
   *     },
   *     "args": {
   *         "args":[
   *             <Car ID>,
   *             <   :  >,
   *             <   :  >
   *         ]
   *     },
   *     "method": {
   *         "method": <method name>
   *         ]
   *     },
   *     "reqID":<req ID> // option
   * }
   * @return {Object} JSON object
   */
  contractTransaction(args: any) {
    return new Promise((resolve, reject) => {
      logger.info("evaluateTransaction start");
      logger.debug(`##evaluateTransaction(A)`);
      const validatorAuthentication = new ValidatorAuthentication({
        logLevel: config.logLevel,
        privateKeyB64,
      });
      let retObj: any = {};
      let reqID = args["reqID"];
      if (reqID === undefined) {
        reqID = null;
      }
      logger.debug(
        `##evaluateTransaction(Aa): args: ${JSON.stringify(
          args.args.args,
        )}, reqID: ${reqID}`,
      );
      const reqparam = {
        method: args.method,
        args: args.args.args,
        channelName: args.contract.channelName,
        contractName: args.contract.contractName,
      };
      // Block generation event monitoring target because it is performed from the operation request by the CC chain code
      InvokeSync(reqparam)
        .then((returnvalue: any) => {
          logger.debug(`##evaluateTransaction(B)`);
          logger.debug(
            `##evaluateTransaction(B1), returnvalue: ${returnvalue}`,
          );
          if (returnvalue == null) {
            logger.debug(`##evaluateTransaction(B2), returnvalue: null`);
          } else if (returnvalue == undefined) {
            logger.debug(`##evaluateTransaction(B3), returnvalue: undefined`);
          } else if (returnvalue == "") {
            logger.debug(
              `##evaluateTransaction(B4), returnvalue: empty string`,
            );
          }
          if (returnvalue != null) {
            logger.debug(`##evaluateTransaction(B5)`);
            let objRetValue = {};
            if (returnvalue != "") {
              logger.debug(`##evaluateTransaction(B6)`);
              objRetValue = JSON.parse(returnvalue);
            }
            const signedResults = validatorAuthentication.sign({
              result: objRetValue,
            });
            retObj = {
              resObj: {
                status: 200,
                data: signedResults,
              },
            };
            if (reqID !== null) {
              retObj["id"] = reqID;
            }
            logger.debug(`##evaluateTransaction(C1c) retObj: ${retObj}`);
            return resolve(retObj);
          }
          logger.debug(`##evaluateTransaction(C)`);
        })
        .catch((err) => {
          logger.debug(`##evaluateTransaction(D)`);
          const emsg = err.toString().replace(/Error: /g, "");
          logger.error(emsg);
          retObj = {
            resObj: {
              status: 504,
              errorDetail: emsg,
            },
          };
          return reject(retObj);
        });
    });
  }

  /**
   * Offline trading
   * @param {object} args :  JSON Object
   * {
   *     "contract": {
   *         "channelName":<channelName>,
   *     },
   *     "args": {
   *         "args":[
   *             {
   *                 "signedCommitProposal":<signedCommitProposal>,
   *                 "commitReq":<commitReq>
   *             }
   *         ]
   *     },
   *     "reqID":<req ID> // option
   * }
   * @return {Object} JSON object
   */
  sendSignedProposal(args: any) {
    return new Promise((resolve, reject) => {
      logger.info("sendSignedProposal start");
      let retObj = {};
      // parameter check
      logger.info("sendSignedProposal parameter check");
      const channelName = args.contract.channelName;
      const signedCommitProposal = args.args.args[0].signedCommitProposal;
      const commitReq = args.args.args[0].commitReq;
      logger.info(`##channelName = ${channelName}`);
      logger.info(`##signedCommitProposal = ${signedCommitProposal}`);
      logger.info(`##commitReq = ${commitReq}`);
      if (signedCommitProposal == undefined || commitReq == undefined) {
        const emsg = "Insufficient parameters.";
        logger.info(emsg);
        retObj = {
          status: 504,
          errorDetail: emsg,
        };
        return reject(retObj);
      }
      const reqparam = {
        signedCommitProposal: signedCommitProposal,
        commitReq: commitReq,
        channelName: channelName,
      };
      // call chainncode
      InvokeSendSignedProposal(reqparam)
        .then((returnvalue) => {
          if (returnvalue != null) {
            retObj = {
              status: 200,
              data: returnvalue,
            };
            return resolve(retObj);
          }
        })
        .catch((err) => {
          const emsg = err.toString().replace(/Error: /g, "");
          logger.error(emsg);
          retObj = {
            status: 504,
            errorDetail: emsg,
          };
          return reject(retObj);
        });
    });
  }
} /* class */

/*
 * Invoke Sync function
 * @param reqBody   [json object]  {fcn:<Chain code function name>, args:[arg1>,<arg2>,,,], channelName:<channelName>, contractName:<contractName>}
 * @return [string] Success: Chain code execution result
 *                  Failure: Chain code error or internal error
 */
async function InvokeSync(reqBody: any) {
  return new Promise(async function (resolve, reject) {
    try {
      logger.info("##fablicaccess: InvokeSync start");
      logger.debug(`##InvokeSync(A)`);

      const type = reqBody.method.type;
      const fcn = reqBody.method.command;
      const args = reqBody.args;

      // Create a new file system based wallet for managing identities.
      //const walletPath = path.join(process.cwd(), 'wallet');
      logger.debug(`##InvokeSync(B)`);
      const wallet = new FileSystemWallet(walletPath);
      console.log(`Wallet path: ${walletPath}`);

      // Check to see if we've already enrolled the user.
      logger.debug(`##InvokeSync(C)`);
      const userExists = await wallet.exists(connUserName);
      if (!userExists) {
        logger.debug(`##InvokeSync(C1)`);
        //logger.error(`An identity for the user ${connUserName} does not exist in the wallet`);
        const errMsg = `An identity for the user ${connUserName} does not exist in the wallet`;
        logger.error(errMsg);
        logger.error("Run the registerUser.js application before retrying");
        return reject(errMsg);
      }

      // Create a new gateway for connecting to our peer node.
      logger.debug(`##InvokeSync(D)`);
      const gateway = new Gateway();
      await gateway.connect(ccp, {
        wallet,
        identity: connUserName,
        discovery: { enabled: false },
      });

      // Get the network (channel) our contract is deployed to.
      logger.debug(`##InvokeSync(E)`);
      const network = await gateway.getNetwork(reqBody.channelName);

      // Get the contract from the network.
      logger.debug(`##InvokeSync(F)`);
      const contract = network.getContract(reqBody.contractName);

      // Submit the specified transaction.
      logger.debug(`##InvokeSync(G)`);
      logger.info(
        `##fablicaccess: InvokeSync Params: type=${type}, fcn=${fcn}, args0=${args[0]}, args1=${args[1]}, args2=${args[2]}`,
      );
      // const transaction = contract.createTransaction(fcn);
      let result: any = null;
      switch (args.length) {
        case 0:
          logger.debug(`##InvokeSync(G1): No args.`);
          if (type === "evaluateTransaction") {
            logger.debug(`##InvokeSync(G1): call evaluateTransaction`);
            result = await contract.evaluateTransaction(fcn);
          } else {
            logger.debug(`##InvokeSync(G1): call submitTransaction`);
            result = await contract.submitTransaction(fcn);
          }
          break;
        case 1:
          logger.debug(`##InvokeSync(G2): One arg.`);
          if (type === "evaluateTransaction") {
            logger.debug(`##InvokeSync(G1): call evaluateTransaction`);
            result = await contract.evaluateTransaction(fcn, args[0]);
          } else {
            logger.debug(`##InvokeSync(G1): call submitTransaction`);
            result = await contract.submitTransaction(fcn, args[0]);
          }
          break;
        case 2:
          logger.debug(`##InvokeSync(G3): Two args.`);
          if (type === "evaluateTransaction") {
            logger.debug(`##InvokeSync(G1): call evaluateTransaction`);
            result = await contract.evaluateTransaction(fcn, args[0], args[1]);
          } else {
            logger.debug(`##InvokeSync(G1): call submitTransaction`);
            result = await contract.submitTransaction(fcn, args[0], args[1]);
          }
          break;
        case 3:
          logger.debug(`##InvokeSync(G4): Three args.`);
          if (type === "evaluateTransaction") {
            logger.debug(`##InvokeSync(G1): call evaluateTransaction`);
            result = await contract.evaluateTransaction(
              fcn,
              args[0],
              args[1],
              args[2],
            );
          } else {
            logger.debug(`##InvokeSync(G1): call submitTransaction`);
            result = await contract.submitTransaction(
              fcn,
              args[0],
              args[1],
              args[2],
            );
          }
          break;
      }
      logger.info(`##fablicaccess: InvokeSync result: ${result}`);
      console.log(`##fablicaccess: InvokeSync result: ${result}`);

      // Disconnect from the gateway.
      logger.debug(`##InvokeSync(H)`);
      await gateway.disconnect();

      logger.debug(`##InvokeSync(I)`);
      return resolve(result);
    } catch (error) {
      logger.debug(`##InvokeSync(Z)`);
      const errMsg = `Failed to submit transaction: ${error}`;
      logger.error(errMsg);
      return reject(errMsg);
    }
  });
}

/**
 * setup TLS for this client
 * @param {*} client
 * @param {*} enrollmentID
 * @param {*} secret
 */
async function TLSSetup(client: any, enrollmentID: string, secret: string) {
  const tlsOptions = {
    trustedRoots: [],
    verify: false,
  };
  logger.info("tlssetup start");
  const caService = new copService(
    SplugConfig.fabric.ca.url,
    // FIXME compiler error - possibly broken code?
    tlsOptions as any,
    SplugConfig.fabric.ca.name,
  );
  const req = {
    enrollmentID: enrollmentID,
    enrollmentSecret: secret,
    profile: "tls",
  };
  const enrollment = await caService.enroll(req);
  client.setTlsClientCertAndKey(
    enrollment.certificate,
    enrollment.key.toBytes(),
  );
}

/**
 * Creating a channel object
 * @param {string} channelName
 */
async function setupChannel(channelName: string) {
  logger.info("setupChannel start");
  const client = new FabricClient();
  await TLSSetup(
    client,
    SplugConfig.fabric.submitter.name,
    SplugConfig.fabric.submitter.secret,
  );
  const channel = client.newChannel(channelName);

  for (let i = 0; i < SplugConfig.fabric.peers.length; i++) {
    const peer = client.newPeer(SplugConfig.fabric.peers[i].requests);
    // FIXME compiler error - possibly broken code?
    channel.addPeer(peer, undefined as any);
  }

  const orderer = client.newOrderer(SplugConfig.fabric.orderer.url);
  channel.addOrderer(orderer);
  logger.info("setupChannel end");
  return channel;
}

/**
 * Function for InvokeSendSignedProposal
 * @param reqBody   [json object]  {signedCommitProposal:<signedCommitProposal>, commitReq:<commitReq>, channelName:<channelName>}
 * @return [string] Success: Chain code execution result
 *                 Failure: Chain code error or internal error
 */
async function InvokeSendSignedProposal(reqBody: any) {
  return new Promise(async function (resolve, reject) {
    logger.info("InvokeSendSignedProposal start");

    let invokeResponse; // Return value from chain code
    let channel; // Channel

    try {
      //channel object generation
      if (channel == undefined) {
        channel = await setupChannel(reqBody.channelName);
      }

      // FIXME compiler error - possibly broken code?
      const response = await channel.sendSignedTransaction({
        signedProposal: reqBody.signedCommitProposal,
        request: reqBody.commitReq,
      } as any);
      logger.info("successfully send signedCommitProposal");
      logger.info("response : " + JSON.stringify(response));
      if (response.status === "SUCCESS") {
        invokeResponse = response;
        return resolve(invokeResponse);
      } else {
        throw new Error(
          "Failed to order the transaction. Error code: " + response.status,
        );
      }
    } catch (e) {
      return reject(e);
    }
  });
}
