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
import { config } from "../common/core/config/default";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerPlugin[" + process.pid + "]");
logger.level = config.logLevel;
// utility
const SplugUtil = require("./PluginUtil.js");
import { ValidatorAuthentication } from "./ValidatorAuthentication";
// Read the library, SDK, etc. according to EC specifications as needed

import { getClientAndChannel, getSubmitterAndEnroll } from "./fabricaccess.js";
import { ProposalRequest } from "fabric-client";
import safeStringify from "fast-safe-stringify";

const path = require("path");
const { FileSystemWallet, Gateway } = require("fabric-network");
const fs = require("fs");
const ccpPath = path.resolve(__dirname, "connection.json");
const ccpJSON = fs.readFileSync(ccpPath, "utf8");
const ccp = JSON.parse(ccpJSON);
const walletPath = path.resolve(__dirname, "wallet");
const connUserName = SplugConfig.fabric.connUserName;

// Cryptographic for fabric
const hash = require("fabric-client/lib/hash");
const jsrsa = require("jsrsasign");
const { KEYUTIL } = jsrsa;
const elliptic = require("elliptic");
const EC = elliptic.ec;

//let xChannel = undefined; // Channel

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
  isExistFunction(funcName) {
    if (this[funcName] != undefined) {
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
  contractTransaction(args) {
    return new Promise((resolve, reject) => {
      logger.info("evaluateTransaction start");
      // logger.debug(`##evaluateTransaction(A)`);
      let retObj = {};
      let reqID = args["reqID"];
      if (reqID === undefined) {
        reqID = null;
      }
      // logger.debug(`##evaluateTransaction(Aa): args: ${JSON.stringify(args.args.args)}, reqID: ${reqID}`);
      const reqparam = {
        method: args.method,
        args: args.args.args,
        channelName: args.contract.channelName,
        contractName: args.contract.contractName,
      };
      // Block generation event monitoring target because it is performed from the operation request by the CC chain code
      InvokeSync(reqparam)
        .then((returnvalue: any) => {
          // logger.debug(`##evaluateTransaction(B)`);
          // logger.debug(`##evaluateTransaction(B1), returnvalue: ${returnvalue}`);
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
            // logger.debug(`##evaluateTransaction(B5)`);
            let objRetValue = {};
            if (returnvalue != "") {
              // logger.debug(`##evaluateTransaction(B6)`);
              objRetValue = JSON.parse(returnvalue);
            }
            const signedResults = ValidatorAuthentication.sign({
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
        })
        .catch((err) => {
          logger.debug(`##evaluateTransaction(D)`);
          retObj = {
            resObj: {
              status: 504,
              errorDetail: safeStringify(err),
            },
          };
          logger.error(err);
          return reject(retObj);
        });
    });
  }

  /**
   * Offline trading
   * @param {object} args :  JSON Object
   * {
   *     "args": {
   *         "contract": {"channelName": channelName},
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
  sendSignedTransaction(args) {
    return new Promise((resolve, reject) => {
      logger.info("sendSignedTransaction start");
      let retObj = {};
      // parameter check
      logger.info("sendSignedTransaction parameter check");
      const channelName = args.contract.channelName;
      const signedCommitProposal = args.args.args[0].signedCommitProposal;
      const commitReq = args.args.args[0].commitReq;
      // logger.debug(`##sendSignedTransaction: channelName = ${channelName}`);
      // logger.debug(`##sendSignedTransaction: signedCommitProposal = ${JSON.stringify(signedCommitProposal)}`);
      // logger.debug(`##sendSignedTransaction: commitReq = ${JSON.stringify(commitReq)}`);
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
      InvokeSendSignedTransaction(reqparam)
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
          retObj = {
            status: 504,
            errorDetail: safeStringify(err),
          };
          logger.error(err);
          return reject(retObj);
        });
    });
  }

  /**
   * sendSignedProposal with commit.
   * @param {object} args :  JSON Object
   * {
   *     "args": {
   *         "contract": {"channelName": channelName},
   *         "args":[
   *             {
   *                 "transactionProposalReq":<transactionProposalReq>,
   *                 "certPem"?:<certPem>,
   *                 "privateKeyPem"?:<privateKeyPem>
   *             }
   *         ]
   *     },
   *     "reqID":<req ID> // option
   * }
   * @return {Object} JSON object
   */
  sendSignedProposal(args) {
    return new Promise((resolve, reject) => {
      logger.info("sendSignedProposal start");
      let retObj = {};

      const channelName = args.contract.channelName;
      const transactionProposalReq = args.args.args.transactionProposalReq;
      const certPem = args.args.args.certPem;
      const privateKeyPem = args.args.args.privateKeyPem;
      let reqID = args["reqID"];
      if (reqID === undefined) {
        reqID = null;
      }
      logger.info(`##sendSignedProposal: reqID: ${reqID}`);

      // call chainncode
      InvokeSendSignedProposal(
        channelName,
        transactionProposalReq,
        certPem,
        privateKeyPem,
      )
        .then((signedTx) => {
          if (signedTx != null) {
            const signedResults = ValidatorAuthentication.sign({
              result: signedTx,
            });
            retObj = {
              resObj: {
                status: 200,
                // "data": signedTx
                data: signedResults,
              },
            };
            if (reqID !== null) {
              retObj["id"] = reqID;
            }
            logger.info(`sendSignedProposal resolve`);
            return resolve(retObj);
          }
        })
        .catch((err) => {
          retObj = {
            resObj: {
              status: 504,
              errorDetail: safeStringify(err),
            },
          };
          logger.error(err);
          logger.info(`sendSignedProposal reject`);
          return reject(retObj);
        });
    });
  }
} /* class */

/*
 * Invoke function
 * @param reqBody   [json object]  {fcn:<Chain code function name>, args:[arg1>,<arg2>,,,]}
 * @return [string] Success: Chain code execution result
 *                  Failure: Chain code error or internal error
 */
async function Invoke(reqBody) {
  let txId = null;
  const theUser = null;
  const eventhubs = [];
  //var invokeResponse; //Return value from chain code

  try {
    logger.info("##fablicaccess: Invoke start");

    const fcn = reqBody.fcn;
    const args = reqBody.args;

    // Create a new file system based wallet for managing identities.
    //const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists(connUserName);
    if (!userExists) {
      //logger.error(`An identity for the user ${connUserName} does not exist in the wallet`);
      const errMsg = `An identity for the user ${connUserName} does not exist in the wallet`;
      logger.error(errMsg);
      logger.error("Run the registerUser.js application before retrying");
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: connUserName,
      discovery: { enabled: false },
    });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork(reqBody.channelName);

    // Get the contract from the network.
    const contract = network.getContract(reqBody.contractName);

    // Submit the specified transaction.
    logger.info(
      `##fablicaccess: Invoke Params: fcn=${fcn}, args0=${args[0]}, args1=${args[1]}`,
    );
    const transaction = contract.createTransaction(fcn);

    txId = transaction.getTransactionID().getTransactionID();
    logger.info("##fablicaccess: txId = " + txId);

    const respData = await transaction.submit(args[0], args[1]);

    // const respData = await contract.submitTransaction(fcn, args[0], args[1]);
    logger.info("Transaction has been submitted");

    // Disconnect from the gateway.
    await gateway.disconnect();
  } catch (error) {
    logger.error(`Failed to submit transaction: ${error}`);
  }
}

/*
 * Invoke Sync function
 * @param reqBody   [json object]  {fcn:<Chain code function name>, args:[arg1>,<arg2>,,,], channelName:<channelName>, contractName:<contractName>}
 * @return [string] Success: Chain code execution result
 *                  Failure: Chain code error or internal error
 */
async function InvokeSync(reqBody) {
  return new Promise(async function (resolve, reject) {
    try {
      logger.info("##fablicaccess: InvokeSync start");
      // logger.debug(`##InvokeSync(A)`);

      const type = reqBody.method.type;
      const fcn = reqBody.method.command;
      const args = reqBody.args;

      // Create a new file system based wallet for managing identities.
      //const walletPath = path.join(process.cwd(), 'wallet');
      // logger.debug(`##InvokeSync(B)`);
      const wallet = new FileSystemWallet(walletPath);
      console.log(`Wallet path: ${walletPath}`);

      // Check to see if we've already enrolled the user.
      // logger.debug(`##InvokeSync(C)`);
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
      // logger.debug(`##InvokeSync(D)`);
      const gateway = new Gateway();
      await gateway.connect(ccp, {
        wallet,
        identity: connUserName,
        discovery: { enabled: false },
      });

      // Get the network (channel) our contract is deployed to.
      // logger.debug(`##InvokeSync(E)`);
      const network = await gateway.getNetwork(reqBody.channelName);

      // Get the contract from the network.
      // logger.debug(`##InvokeSync(F)`);
      const contract = network.getContract(reqBody.contractName);

      // Submit the specified transaction.
      // logger.debug(`##InvokeSync(G)`);
      logger.info(
        `##fablicaccess: InvokeSync Params: type=${type}, fcn=${fcn}, args0=${args[0]}, args1=${args[1]}, args2=${args[2]}`,
      );
      // const transaction = contract.createTransaction(fcn);
      let result: any = null;
      switch (args.length) {
        case 0:
          // logger.debug(`##InvokeSync(G1): No args.`);
          if (type === "evaluateTransaction") {
            logger.debug(`##InvokeSync(G1): call evaluateTransaction`);
            result = await contract.evaluateTransaction(fcn);
          } else {
            logger.debug(`##InvokeSync(G1): call submitTransaction`);
            result = await contract.submitTransaction(fcn);
          }
          break;
        case 1:
          // logger.debug(`##InvokeSync(G2): One arg.`);
          if (type === "evaluateTransaction") {
            logger.debug(`##InvokeSync(G1): call evaluateTransaction`);
            result = await contract.evaluateTransaction(fcn, args[0]);
          } else {
            logger.debug(`##InvokeSync(G1): call submitTransaction`);
            result = await contract.submitTransaction(fcn, args[0]);
          }
          break;
        case 2:
          // logger.debug(`##InvokeSync(G3): Two args.`);
          if (type === "evaluateTransaction") {
            logger.debug(`##InvokeSync(G1): call evaluateTransaction`);
            result = await contract.evaluateTransaction(fcn, args[0], args[1]);
          } else {
            logger.debug(`##InvokeSync(G1): call submitTransaction`);
            result = await contract.submitTransaction(fcn, args[0], args[1]);
          }
          break;
        case 3:
          // logger.debug(`##InvokeSync(G4): Three args.`);
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
      // logger.debug(`##InvokeSync(H)`);
      await gateway.disconnect();

      logger.debug(`##InvokeSync(I)`);
      return resolve(result);
    } catch (error) {
      // logger.debug(`##InvokeSync(Z)`);
      const errMsg = `Failed to submit transaction: ${error}`;
      logger.error(errMsg);
      return reject(errMsg);
    }
  });
}

// BEGIN Signature process=====================================================================================
// this ordersForCurve comes from CryptoSuite_ECDSA_AES.js and will be part of the
// stand alone fabric-sig package in future.
const ordersForCurve = {
  secp256r1: {
    halfOrder: elliptic.curves.p256.n.shrn(1),
    order: elliptic.curves.p256.n,
  },
  secp384r1: {
    halfOrder: elliptic.curves.p384.n.shrn(1),
    order: elliptic.curves.p384.n,
  },
};

// this function comes from CryptoSuite_ECDSA_AES.js and will be part of the
// stand alone fabric-sig package in future.
function preventMalleability(sig, curveParams) {
  const halfOrder = ordersForCurve[curveParams.name].halfOrder;
  if (!halfOrder) {
    throw new Error(
      'Can not find the half order needed to calculate "s" value for immalleable signatures. Unsupported curve name: ' +
        curveParams.name,
    );
  }

  // in order to guarantee 's' falls in the lower range of the order, as explained in the above link,
  // first see if 's' is larger than half of the order, if so, it needs to be specially treated
  if (sig.s.cmp(halfOrder) === 1) {
    // module 'bn.js', file lib/bn.js, method cmp()
    // convert from BigInteger used by jsrsasign Key objects and bn.js used by elliptic Signature objects
    const bigNum = ordersForCurve[curveParams.name].order;
    sig.s = bigNum.sub(sig.s);
  }

  return sig;
}

/**
 * this method is used for test at this moment. In future this
 * would be a stand alone package that running at the browser/cellphone/PAD
 *
 * @param {string} privateKey PEM encoded private key
 * @param {Buffer} proposalBytes proposal bytes
 */
function sign(privateKey, proposalBytes, algorithm, keySize) {
  const hashAlgorithm = algorithm.toUpperCase();
  const hashFunction = hash[`${hashAlgorithm}_${keySize}`];
  const ecdsaCurve = elliptic.curves[`p${keySize}`];
  const ecdsa = new EC(ecdsaCurve);
  const key = KEYUTIL.getKey(privateKey);

  const signKey = ecdsa.keyFromPrivate(key.prvKeyHex, "hex");
  const digest = hashFunction(proposalBytes);

  let sig = ecdsa.sign(Buffer.from(digest, "hex"), signKey);
  sig = preventMalleability(sig, key.ecparams);

  return Buffer.from(sig.toDER());
}

function signProposal(proposalBytes, paramPrivateKeyPem) {
  logger.debug("signProposal start");

  const signature = sign(paramPrivateKeyPem, proposalBytes, "sha2", 256);
  const signedProposal = { signature, proposal_bytes: proposalBytes };
  return signedProposal;
}
// END Signature process=========================================================================================

/**
 * Function for InvokeSendSignedTransaction
 * @param reqBody   [json object]  {signedCommitProposal:<signedCommitProposal>, commitReq:<commitReq>, channelName:<channelName>}
 * @return [string] Success: Chain code execution result
 *                 Failure: Chain code error or internal error
 */
async function InvokeSendSignedTransaction(reqBody) {
  return new Promise(async function (resolve, reject) {
    logger.info("InvokeSendSignedTransaction start");

    let invokeResponse1; // Return value from chain code

    try {
      //channel object generation
      let { client, channel } = await getClientAndChannel(reqBody.channelName);
      await getSubmitterAndEnroll(client);

      // logger.debug(`##InvokeSendSignedTransaction: reqBody.signedCommitProposal: ${JSON.stringify(reqBody.signedCommitProposal)}`);
      // logger.debug(`##InvokeSendSignedTransaction: reqBody.commitReq: ${JSON.stringify(reqBody.commitReq)}`);
      // logger.debug(`##InvokeSendSignedTransaction: (A)`);
      const response = await channel.sendSignedTransaction({
        signedProposal: reqBody.signedCommitProposal,
        request: reqBody.commitReq,
      });
      // logger.debug(`##InvokeSendSignedTransaction: (B)`);
      logger.info("successfully send signedCommitProposal");
      // logger.info("response : " + JSON.stringify(response));
      if (response.status === "SUCCESS") {
        // logger.debug(`##InvokeSendSignedTransaction: (C)`);
        invokeResponse1 = response;
        return resolve(invokeResponse1);
      } else {
        logger.debug(`##InvokeSendSignedTransaction: (D)`);
        throw new Error(
          "Failed to order the transaction. Error code: " + response.status,
        );
      }
    } catch (e) {
      logger.debug(`##InvokeSendSignedTransaction: (E)`);
      return reject(e);
    }
  });
}

/**
 * Function for InvokeSendSignedProposal
 * @param transactionProposalReq   [json object]  {signedCommitProposal:<signedCommitProposal>, commitReq:<commitReq>, channelName:<channelName>}
 * @param certPem?   [json object]  {signedCommitProposal:<signedCommitProposal>, commitReq:<commitReq>, channelName:<channelName>}
 * @param privateKeyPem?   [json object]  {signedCommitProposal:<signedCommitProposal>, commitReq:<commitReq>, channelName:<channelName>}
 * @return [string] signed transaction.
 */
async function InvokeSendSignedProposal(
  channelName: string,
  transactionProposalReq: ProposalRequest,
  certPem?: string,
  privateKeyPem?: string,
) {
  logger.debug(`InvokeSendSignedProposal start`);

  let invokeResponse2; // Return value from chain code
  let { client, channel } = await getClientAndChannel(channelName);
  let user = await getSubmitterAndEnroll(client);

  // Low-level access to local-store cert and private key of submitter (in case request is missing those)
  if (!certPem || !privateKeyPem) {
    const wallet = new FileSystemWallet(SplugConfig.fabric.keystore);
    logger.debug(`Wallet path: ${path.resolve(SplugConfig.fabric.keystore)}`);

    const submitterName = user.getName();
    const submitterExists = await wallet.exists(submitterName);
    if (submitterExists) {
      const submitterIdentity = await wallet.export(submitterName);
      certPem = (submitterIdentity as any).certificate;
      privateKeyPem = (submitterIdentity as any).privateKey;
    } else {
      throw new Error(
        `No cert/key provided and submitter ${submitterName} is missing in validator wallet!`,
      );
    }
  }

  const { proposal, txId } = channel.generateUnsignedProposal(
    transactionProposalReq,
    SplugConfig.fabric.mspid,
    certPem,
  );
  logger.debug(`##InvokeSendSignedProposal; txId: ${txId.getTransactionID()}`);
  const signedProposal = signProposal(proposal.toBuffer(), privateKeyPem);

  const targets = [];
  for (const peerInfo of SplugConfig.fabric.peers) {
    const peer = channel.getPeer(peerInfo.requests.split("//")[1]);
    targets.push(peer);
  }
  const sendSignedProposalReq = { signedProposal, targets } as unknown;
  const proposalResponses = await channel.sendSignedProposal(
    sendSignedProposalReq,
  );
  logger.debug("##InvokeSendSignedProposal: successfully send signedProposal");

  let allGood = true;
  for (const proposalResponse of proposalResponses) {
    let oneGood = false;
    if (
      proposalResponses &&
      proposalResponse.response &&
      proposalResponse.response.status === 200
    ) {
      if (proposalResponse.response.payload) {
        invokeResponse2 = proposalResponse.response.payload;
      }
      oneGood = true;
    } else {
      logger.debug("##InvokeSendSignedProposal: transaction proposal was bad");
      const resStr = proposalResponse.toString();
      const errMsg = resStr.replace("Error: ", "");
      throw new Error(errMsg);
    }
    allGood = allGood && oneGood;
  }

  // If the return value of invoke is an empty string, store txID
  if (invokeResponse2 === "") {
    invokeResponse2 = txId.getTransactionID();
  }

  // Error if all peers do not return status 200
  if (!allGood) {
    const errMsg =
      "'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...";
    logger.debug(`##InvokeSendSignedProposal: ${errMsg}`);
    throw new Error(errMsg);
  }

  /**
   * End the endorse step.
   * Start to commit the tx.
   */
  const commitReq = {
    proposalResponses,
    proposal,
  };

  const commitProposal = channel.generateUnsignedTransaction(commitReq);
  logger.debug(
    `##InvokeSendSignedProposal: Successfully build commit transaction proposal`,
  );

  // sign this commit proposal at local
  const signedCommitProposal = signProposal(
    commitProposal.toBuffer(),
    privateKeyPem,
  );

  const signedTx = {
    signedCommitProposal: signedCommitProposal,
    commitReq: commitReq,
    txId: txId.getTransactionID(),
  };

  // logger.debug(`##InvokeSendSignedProposal: signature: ${signedCommitProposal.signature}`);
  // logger.debug(`##InvokeSendSignedProposal: proposal_bytes: ${signedCommitProposal.proposal_bytes}`);
  // logger.debug(`##InvokeSendSignedProposal: signedTx: ${JSON.stringify(signedTx)}`);
  logger.debug("##InvokeSendSignedProposal: signedTx:", signedTx);
  return signedTx;
}
