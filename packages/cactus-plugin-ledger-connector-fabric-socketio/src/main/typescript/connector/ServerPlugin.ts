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

import path from "path";
import Client, {
  Proposal,
  ProposalRequest,
  ProposalResponse,
  Block,
} from "fabric-client";
import { FileSystemWallet, Gateway } from "fabric-network";

import { getClientAndChannel, getSubmitterAndEnroll } from "./fabricaccess";
import { signProposal } from "./sign-utils";
import {
  ProposalSerializer,
  ProposalResponseSerializer,
} from "./fabric-proto-serializers";

// Config reading
import {
  configRead,
  signMessageJwt,
} from "@hyperledger/cactus-cmd-socketio-server";
const connUserName = configRead<string>("fabric.connUserName");

// Log settings
import { getLogger } from "log4js";
import { safeStringifyException } from "@hyperledger/cactus-common";
const logger = getLogger("ServerPlugin[" + process.pid + "]");
logger.level = configRead<string>("logLevel", "info");

/////////////////////////////
// API call signatures
/////////////////////////////

/**
 * `generateUnsignedProposal()` input argument type.
 */
type GenerateUnsignedProposalArgs = {
  contract: {
    channelName: string;
  };
  args: {
    args: {
      transactionProposalReq: Client.ProposalRequest;
      certPem: string;
    };
  };
  reqID?: string;
};

/**
 * `generateUnsignedTransaction()` input argument type.
 */
type GenerateUnsignedTransactionArgs = {
  contract: {
    channelName: string;
  };
  args: {
    args: {
      proposal: string;
      proposalResponses: string[];
    };
  };
  reqID?: string;
};

/**
 * `sendSignedProposal()` input argument type.
 */
type SendSignedProposalArgs = {
  contract: {
    channelName: string;
  };
  args: {
    args: {
      transactionProposalReq: Client.ProposalRequest;
      certPem?: string;
      privateKeyPem?: string;
    };
  };
  reqID?: string;
};

/**
 * `sendSignedProposalV2()` input argument type.
 */
type SendSignedProposalV2Args = {
  contract: {
    channelName: string;
  };
  args: {
    args: {
      signedProposal: Buffer;
    };
  };
  reqID?: string;
};

/**
 * `sendSignedTransactionV2()` input argument type.
 */
type SendSignedTransactionV2Args = {
  contract: {
    channelName: string;
  };
  args: {
    args: {
      signedCommitProposal: Buffer;
      proposal: string;
      proposalResponses: string[];
    };
  };
  reqID?: string;
};

/////////////////////////////
// ServerPlugin Class
/////////////////////////////

export class ServerPlugin {
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
  isExistFunction(funcName: string) {
    if ((this as any)[funcName]) {
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
      // logger.debug(`##evaluateTransaction(A)`);
      let retObj: Record<string, any>;
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
            const signedResults = signMessageJwt({
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
              errorDetail: safeStringifyException(err),
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
  sendSignedTransaction(args: any) {
    return new Promise((resolve, reject) => {
      logger.info("sendSignedTransaction start");
      let retObj: Record<string, any>;

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
              resObj: {
                status: 200,
                data: returnvalue,
              },
            };

            if (args.reqID) {
              retObj["id"] = args.reqID;
            }
            return resolve(retObj);
          }
        })
        .catch((err) => {
          retObj = {
            status: 504,
            errorDetail: safeStringifyException(err),
          };
          logger.error(err);
          return reject(retObj);
        });
    });
  }

  /**
   * API request to send commit transaction signed on the client side.
   * No user cryptographic data is handled by this function.
   * Uses Fabric-SDK `channel.sendSignedTransaction` call.
   *
   * @param args.signedCommitProposal Signed commit proposal buffer.
   * @param args.proposal Encoded proposal from `generateUnsignedProposal` API call.
   * @param args.proposalResponses Encoded endorsing responses from `sendSignedProposalV2` API call.
   * @returns Send status.
   */
  async sendSignedTransactionV2(args: SendSignedTransactionV2Args) {
    logger.info("sendSignedTransactionV2 start");

    // Parse arguments
    const channelName = args.contract.channelName;
    const signedCommitProposal = args.args.args.signedCommitProposal;
    const proposal = ProposalSerializer.decode(args.args.args.proposal);
    let proposalResponses: any[] = args.args.args.proposalResponses.map((val) =>
      ProposalResponseSerializer.decode(val),
    );
    let reqID = args.reqID;
    logger.info(`##sendSignedTransactionV2: reqID: ${reqID}`);

    if (
      !channelName ||
      !signedCommitProposal ||
      !proposal ||
      proposalResponses.length === 0
    ) {
      throw {
        resObj: {
          status: 504,
          errorDetail: "sendSignedTransactionV2: Invalid input parameters",
        },
      };
    }

    // Logic
    try {
      const invokeResponse = await InvokeSendSignedTransaction({
        signedCommitProposal,
        commitReq: {
          proposal,
          proposalResponses,
        },
        channelName: channelName,
      });
      logger.info("sendSignedTransactionV2: done.");

      return {
        id: reqID,
        resObj: {
          status: 200,
          data: invokeResponse,
        },
      };
    } catch (error) {
      logger.error("sendSignedTransactionV2() error:", error);
      throw {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(error),
        },
      };
    }
  }

  /**
   * API request to send transaction endorsment.
   * Uses cryptographic data either from input arguments, or from local (connectors) wallet.
   *
   * @param args.transactionProposalReq Raw transaction that will be turned into proposal.
   * @param args.certPem Client public key in PEM format.
   * @param args.privateKeyPem Client private key in PEM format.
   * @returns signedCommitProposal Signed transaction proposal.
   * @returns commitReq Unsigned commit request.
   * @returns txId Transaction ID.
   */
  async sendSignedProposal(args: SendSignedProposalArgs) {
    logger.info("sendSignedProposal start");

    // Parse arguments
    const channelName = args.contract.channelName;
    const transactionProposalReq = args.args.args.transactionProposalReq;
    let certPem = args.args.args.certPem;
    let privateKeyPem = args.args.args.privateKeyPem;
    let reqID = args.reqID;
    logger.info(`##sendSignedProposal: reqID: ${reqID}`);

    // Logic
    try {
      let { client, channel } = await getClientAndChannel(channelName);

      if (!certPem || !privateKeyPem) {
        // Get identity from connector wallet
        const submiterId = await getSubmiterIdentityCrypto(client);
        certPem = submiterId.certPem;
        privateKeyPem = submiterId.privateKeyPem;
      }

      if (!certPem || !privateKeyPem) {
        throw Error(
          "Could not read certificate and private key of the submitter.",
        );
      }

      // Generate endorsement proposal
      const { proposal, txId } = InvokeGenerateUnsignedProposal(
        channel,
        transactionProposalReq,
        certPem,
      );
      const signedProposal = signProposal(proposal.toBuffer(), privateKeyPem);

      // Send proposal, get endorsment responses
      const {
        endorsmentStatus,
        proposalResponses,
      } = await InvokeSendSignedProposalV2(channel, signedProposal as any);
      logger.info("sendSignedProposal: done.");

      if (!endorsmentStatus) {
        throw new Error(
          "Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...",
        );
      }

      // Generate commit proposal
      const commitProposal = await InvokeGenerateUnsignedTransaction(
        channel,
        proposalResponses as any,
        proposal,
      );
      const signedCommitProposal = signProposal(
        commitProposal.toBuffer(),
        privateKeyPem,
      );

      // Send the response
      const signedResults = signMessageJwt({
        result: {
          signedCommitProposal,
          commitReq: { proposalResponses, proposal },
          txId: txId.getTransactionID(),
        },
      });

      return {
        id: reqID,
        resObj: {
          status: 200,
          data: signedResults,
        },
      };
    } catch (error) {
      logger.error("sendSignedProposal() error:", error);
      throw {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(error),
        },
      };
    }
  }

  /**
   * Get fabric block specified in args.
   *
   * @param args
   * ``` javascript
   * {
   *     "args": {
   *         "contract": {"channelName": string}, // Fabric channel to execute the request on
   *         "args": {
   *            // OneOf following fields is required. First one found will be used.
   *            "blockNumber"?: number,
   *            "blockHash"?: Array<byte>,
   *            "txId"?: string,
   *            // Optional. If true, this function returns an encoded block.
   *            "skipDecode"?: boolean,
   *          }
   *     },
   *     "reqID": string // optional requestID from verifier
   * }
   * ```
   */
  async getBlock(args: any) {
    logger.info("getBlock start");

    const channelName = args.contract.channelName;
    const blockNumber = args.args.blockNumber;
    const blockHash = args.args.blockHash;
    const txId = args.args.txId;
    const skipDecode = args.args.skipDecode ?? false;

    const reqID = args.reqID ?? null;
    logger.info(`##getBlock: reqID: ${reqID}`);

    let { client, channel } = await getClientAndChannel(channelName);
    await getSubmitterAndEnroll(client);

    let block: Block;
    if (typeof blockNumber === "number") {
      block = await channel.queryBlock(
        blockNumber,
        undefined,
        undefined,
        skipDecode,
      );
    } else if (blockHash) {
      block = await channel.queryBlockByHash(
        blockHash,
        undefined,
        undefined,
        skipDecode,
      );
    } else if (txId) {
      block = await channel.queryBlockByTxID(
        txId,
        undefined,
        undefined,
        skipDecode,
      );
    } else {
      const errObj = {
        resObj: {
          status: 400,
          errorDetail:
            "getBlock: Provide either blockNumber, blockHash, or txId",
        },
        id: reqID,
      };
      logger.error(errObj);
      throw errObj;
    }

    if (!block) {
      const errObj = {
        resObj: {
          status: 504,
          errorDetail: "getBlock: Could not retrieve block",
        },
        id: reqID,
      };
      logger.error(errObj);
      throw errObj;
    }

    const signedBlock = signMessageJwt({
      result: block,
    });

    const retObj = {
      resObj: {
        status: 200,
        data: signedBlock,
      },
      id: reqID,
    };
    logger.debug("##getBlock: response:", retObj);

    return retObj;
  }

  /**
   * API request to send endorsement proposal signed on the client side.
   * No user cryptographic data is handled by this function.
   * Uses Fabric-SDK `channel.sendSignedProposal` call.
   *
   * @param args.signedProposal Signed proposal buffer from `generateUnsignedProposal` API call.
   * @returns endorsmentStatus Bool whether endorsment was OK or not.
   * @returns proposalResponses Encoded responses to be used to generate commit proposal.
   */
  async sendSignedProposalV2(args: SendSignedProposalV2Args) {
    logger.info("sendSignedProposalV2 start");

    // Parse arguments
    const channelName = args.contract.channelName;
    const signedProposal = args.args.args.signedProposal;
    let reqID = args.reqID;
    logger.info(`##sendSignedProposalV2: reqID: ${reqID}`);

    // Logic
    try {
      let { channel } = await getClientAndChannel(channelName);

      const invokeResponse = await InvokeSendSignedProposalV2(
        channel,
        signedProposal,
      );
      logger.info("sendSignedProposalV2: done.");

      let proposalResponses = invokeResponse.proposalResponses.map((val: any) =>
        ProposalResponseSerializer.encode(val),
      );
      logger.debug(
        `sendSignedProposalV2: encoded ${proposalResponses.length} proposalResponses.`,
      );

      const signedResults = signMessageJwt({
        result: {
          endorsmentStatus: invokeResponse.endorsmentStatus,
          proposalResponses,
        },
      });

      return {
        id: reqID,
        resObj: {
          status: 200,
          data: signedResults,
        },
      };
    } catch (error) {
      logger.error("sendSignedProposalV2() error:", error);
      throw {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(error),
        },
      };
    }
  }

  /**
   * API request to generate unsigned endorse proposal.
   * Proposal must be signed on the client side.
   * Uses Fabric-SDK `channel.generateUnsignedProposal` call.
   *
   * @param args.transactionProposalReq Raw transaction that will be turned into proposal.
   * @param args.certPem Client public key in PEM format.
   * @returns proposalBuffer Generated unsigned endorse proposal buffer.
   * @returns proposal Encoded proposal to be used in follow-up calls to the connector.
   * @returns txId Transaction ID.
   */
  async generateUnsignedProposal(args: GenerateUnsignedProposalArgs) {
    logger.info("generateUnsignedProposal: start");

    // Parse arguments
    const channelName = args.contract.channelName;
    const transactionProposalReq = args.args.args.transactionProposalReq;
    const certPem = args.args.args.certPem;
    let reqID = args.reqID;
    logger.info(`##generateUnsignedProposal: reqID: ${reqID}`);

    // Logic
    try {
      let { channel } = await getClientAndChannel(channelName);

      let invokeResponse = InvokeGenerateUnsignedProposal(
        channel,
        transactionProposalReq,
        certPem,
      );
      if (!invokeResponse.proposal || !invokeResponse.txId) {
        throw new Error(
          "generateUnsignedProposal: empty proposal or transaction id.",
        );
      }
      logger.info(`generateUnsignedProposal: done.`);

      const signedResults = signMessageJwt({
        result: {
          proposalBuffer: invokeResponse.proposal.toBuffer(),
          proposal: ProposalSerializer.encode(invokeResponse.proposal),
          txId: invokeResponse.txId.getTransactionID(),
        },
      });

      return {
        id: reqID,
        resObj: {
          status: 200,
          data: signedResults,
        },
      };
    } catch (error) {
      logger.error("generateUnsignedProposal() error:", error);
      throw {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(error),
        },
      };
    }
  }

  /**
   * API request to generate unsigned commit (transaction) proposal.
   * Proposal must be signed on the client side.
   * Uses Fabric-SDK `channel.generateUnsignedTransaction` call.
   *
   * @param args.proposal Encoded proposal from `generateUnsignedProposal` API call.
   * @param args.proposalResponses Encoded proposal responses from `sendSignedProposalV2` API call.
   * @returns txProposalBuffer Unsigned proposal buffer.
   */
  async generateUnsignedTransaction(args: GenerateUnsignedTransactionArgs) {
    logger.info("generateUnsignedTransaction: start");

    // Parse arguments
    const channelName = args.contract.channelName;
    const proposal = ProposalSerializer.decode(args.args.args.proposal);
    let proposalResponses: any[] = args.args.args.proposalResponses.map((val) =>
      ProposalResponseSerializer.decode(val),
    );
    logger.debug(
      `##generateUnsignedTransaction Received ${proposalResponses.length} proposal responses`,
    );
    let reqID = args.reqID;
    logger.info(`##generateUnsignedTransaction: reqID: ${reqID}`);

    // Logic
    try {
      let { channel } = await getClientAndChannel(channelName);

      const txProposal = await InvokeGenerateUnsignedTransaction(
        channel,
        proposalResponses,
        proposal,
      );
      logger.info(`generateUnsignedTransaction: done.`);

      const signedResults = signMessageJwt({
        result: {
          txProposalBuffer: txProposal.toBuffer(),
        },
      });

      return {
        id: reqID,
        resObj: {
          status: 200,
          data: signedResults,
        },
      };
    } catch (error) {
      logger.error("generateUnsignedTransaction() error:", error);
      throw {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(error),
        },
      };
    }
  }
} /* class */

/////////////////////////////
// Invoke (logic) functions
/////////////////////////////

/**
 * Read public and private keys of the submitter from connector wallet.
 * Throws `Error()` when submiters identity is missing.
 *
 * @param client Fabric-SDK channel client object.
 * @returns `certPem`, `privateKeyPem`
 */
async function getSubmiterIdentityCrypto(client: Client) {
  const wallet = new FileSystemWallet(configRead<string>("fabric.keystore"));
  logger.debug(
    `Wallet path: ${path.resolve(configRead<string>("fabric.keystore"))}`,
  );

  let user = await getSubmitterAndEnroll(client);
  const submitterName = user.getName();
  const submitterExists = await wallet.exists(submitterName);
  if (submitterExists) {
    const submitterIdentity = await wallet.export(submitterName);
    const certPem = (submitterIdentity as any).certificate as string;
    const privateKeyPem = (submitterIdentity as any).privateKey as string;
    return { certPem, privateKeyPem };
  } else {
    throw new Error(
      `No cert/key provided and submitter ${submitterName} is missing in validator wallet!`,
    );
  }
}

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
      // logger.debug(`##InvokeSync(A)`);

      const type = reqBody.method.type;
      const fcn = reqBody.method.command;
      const args = reqBody.args;

      // Create a new file system based wallet for managing identities.
      // logger.debug(`##InvokeSync(B)`);
      const wallet = new FileSystemWallet(
        configRead<string>("fabric.keystore"),
      );
      console.log(`Wallet path: ${configRead<string>("fabric.keystore")}`);

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
      let { client } = await getClientAndChannel(reqBody.channelName);
      await getSubmitterAndEnroll(client);

      const gateway = new Gateway();
      await gateway.connect(client, {
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

/**
 * Function for InvokeSendSignedTransaction
 * @param reqBody   [json object]  {signedCommitProposal:<signedCommitProposal>, commitReq:<commitReq>, channelName:<channelName>}
 * @return [string] Success: Chain code execution result
 *                 Failure: Chain code error or internal error
 */
async function InvokeSendSignedTransaction(reqBody: any) {
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
      } as any);

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
 * Call `channel.generateUnsignedProposal` to generate unsigned endorse proposal.
 *
 * @param channel Fabric-SDK channel object.
 * @param txProposal Raw transaction.
 * @param certPem Sender public key in PEM format.
 * @returns `proposal` - Proposal, `txId` - Transaction object
 */
function InvokeGenerateUnsignedProposal(
  channel: Client.Channel,
  txProposal: ProposalRequest,
  certPem: string,
) {
  if (!txProposal || !certPem) {
    throw new Error(
      "InvokeGenerateUnsignedProposal: Invalid input parameters.",
    );
  }

  logger.debug("Call channel.generateUnsignedProposal()");

  return (channel.generateUnsignedProposal(
    txProposal,
    configRead<string>("fabric.mspid"),
    certPem,
    false,
  ) as any) as { proposal: any; txId: any };
}

/**
 * Call `channel.generateUnsignedTransaction` to generate unsigned commit proposal.
 *
 * @param channel Fabric-SDK channel object.
 * @param proposalResponses Proposal responses from endorse step.
 * @param proposal Unsigned proposal from `generateUnsignedProposal`
 * @returns Unsigned commit proposal.
 */
async function InvokeGenerateUnsignedTransaction(
  channel: Client.Channel,
  proposalResponses: ProposalResponse[],
  proposal: Proposal,
) {
  if (!proposal || !proposalResponses || proposalResponses.length === 0) {
    throw new Error(
      "InvokeGenerateUnsignedTransaction: Invalid input parameters.",
    );
  }

  logger.debug("Call channel.generateUnsignedTransaction()");

  return await channel.generateUnsignedTransaction({
    proposalResponses,
    proposal,
  });
}

/**
 * Call `channel.sendSignedProposal`, gather and check the responses.
 *
 * @param channel Fabric-SDK channel object.
 * @param signedProposal Proposal from `generateUnsignedProposal` signed with sender private key.
 * @returns `endorsmentStatus`, `proposalResponses`
 */
async function InvokeSendSignedProposalV2(
  channel: Client.Channel,
  signedProposal: Buffer,
) {
  logger.debug(`InvokeSendSignedProposalV2: start`);

  const targets = [];
  for (const peerInfo of configRead<any[]>("fabric.peers")) {
    const peer = channel.getPeer(peerInfo.requests.split("//")[1]);
    targets.push(peer);
  }
  const sendSignedProposalReq = { signedProposal, targets } as any;

  const proposalResponses = await channel.sendSignedProposal(
    sendSignedProposalReq,
  );
  logger.debug(
    "##InvokeSendSignedProposalV2: successfully sent signedProposal",
  );

  // Determine endorsment status
  let endorsmentStatus = true;
  for (const proposalResponse of proposalResponses) {
    const propResponse = (proposalResponse as unknown) as Client.ProposalResponse;
    if (
      !propResponse ||
      !propResponse.response ||
      propResponse.response.status !== 200
    ) {
      endorsmentStatus = false;
    }
  }

  return {
    endorsmentStatus,
    proposalResponses,
  };
}
