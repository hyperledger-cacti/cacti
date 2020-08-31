/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionFabric.ts
 */

////////
// Usage
//
////////

/* Summary:
 * Request library for fabric v1.4.0 (for offline signature) Processing library Testing library
 * In this case, it is used only when transferring assets.
 */

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'TransactionFabric';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Fabric node-sdk
const classFabricCAService = require('fabric-ca-client');
const classClient = require('fabric-client');

// Cryptographic
const hash = require('fabric-client/lib/hash');
const jsrsa = require('jsrsasign');
const { KEYUTIL } = jsrsa;
const elliptic = require('elliptic');
const EC = elliptic.ec;

// BEGIN Signature process=====================================================================================

// this ordersForCurve comes from CryptoSuite_ECDSA_AES.js and will be part of the
// stand alone fabric-sig package in future.
const ordersForCurve = {
    'secp256r1': {
        'halfOrder': elliptic.curves.p256.n.shrn(1),
        'order': elliptic.curves.p256.n
    },
    'secp384r1': {
        'halfOrder': elliptic.curves.p384.n.shrn(1),
        'order': elliptic.curves.p384.n
    }
};

// this function comes from CryptoSuite_ECDSA_AES.js and will be part of the
// stand alone fabric-sig package in future.
function _preventMalleability(sig, curveParams) {
    const halfOrder = ordersForCurve[curveParams.name].halfOrder;
    if (!halfOrder) {
        throw new Error('Can not find the half order needed to calculate "s" value for immalleable signatures. Unsupported curve name: ' + curveParams.name);
    }

    // in order to guarantee 's' falls in the lower range of the order, as explained in the above link,
    // first see if 's' is larger than half of the order, if so, it needs to be specially treated
    if (sig.s.cmp(halfOrder) === 1) { // module 'bn.js', file lib/bn.js, method cmp()
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

    const signKey = ecdsa.keyFromPrivate(key.prvKeyHex, 'hex');
    const digest = hashFunction(proposalBytes);

    let sig = ecdsa.sign(Buffer.from(digest, 'hex'), signKey);
    sig = _preventMalleability(sig, key.ecparams);

    return Buffer.from(sig.toDER());
}

function signProposal(proposalBytes, paramPrivateKeyPem) {
    logger.debug("signProposal start");

    const signature = sign(paramPrivateKeyPem, proposalBytes, 'sha2', 256);
    const signedProposal = { signature, proposal_bytes: proposalBytes };
    return signedProposal;
}

// END Signature process=========================================================================================


// setup TLS for this client
async function TLSSetup(client, enrollmentID, secret) {
    const tlsOptions = {
        trustedRoots: [],
        verify: false
    };
    logger.debug("tlssetup start");
    const caService = new classFabricCAService(config.cartradeInfo.fabric.ca.URL, tlsOptions, config.cartradeInfo.fabric.ca.name);
    const req = {
        enrollmentID: enrollmentID,
        enrollmentSecret: secret,
        profile: 'tls'
    };
    const enrollment = await caService.enroll(req);
    client.setTlsClientCertAndKey(enrollment.certificate, enrollment.key.toBytes());
}


// Creating a channel object
async function setupChannel(channelName) {
    logger.debug("setupChannel start");
    const client = new classClient();
    await TLSSetup(client, config.cartradeInfo.fabric.submitter.name, config.cartradeInfo.fabric.submitter.secret);
    const channel = client.newChannel(channelName);

    // add peer to channel
    // const peerTLSCertPath = path.resolve(__dirname, './crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tlscacerts/org1.example.com-cert.pem');
    // const peerPEMCert = fs.readFileSync(peerTLSCertPath, 'utf8');
    for (let i = 0; i < config.cartradeInfo.fabric.peers.length; i++) {
        const peer = client.newPeer(
            config.cartradeInfo.fabric.peers[i].requests
            /*{
                pem: peerPEMCert,
                'ssl-target-name-override': 'peer0.org1.example.com',
            }
            */
        );
        channel.addPeer(peer);
    }

    // add orderer to channel
    /*
    const ordererTLSCertPath = path.resolve(__dirname, './crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tlscacerts/example.com-cert.pem');
    const ordererPEMCert = fs.readFileSync(ordererTLSCertPath, 'utf8');
    */
    const orderer = client.newOrderer(
        config.cartradeInfo.fabric.orderer.URL
        /*{
            pem: ordererPEMCert,
            'ssl-target-name-override': 'orderer.example.com',
        }
        */
    );
    channel.addOrderer(orderer);
    // TODO: channel.initialize() should not require an signning identity
    // await channel.initialize();
    return channel;
}

export function makeSignedProposal(ccFncName: string, ccArgs: string[]): Promise<{ data: {}, txId: string }> {
    // exports.Invoke = async function(reqBody, isWait){
    // let eventhubs = []; // For the time being, give up the eventhub connection of multiple peers.
    let invokeResponse; // Return value from chain code
    let channel;

    return new Promise(async (resolve, reject) => {
        try {
            // channel object generation
            if (channel === undefined) {
                channel = await setupChannel(config.cartradeInfo.fabric.channelName);
            }

            /*
             *  Endorse step
             */
            const transactionProposalReq = {
                fcn: ccFncName,                     // Chaincode function name
                args: ccArgs,                       // Chaincode argument
                chaincodeId: config.cartradeInfo.fabric.chaincodeID,
                channelId: config.cartradeInfo.fabric.channelName,
            };
            logger.debug(transactionProposalReq);

            // Get certificate and key acquisition
            const certPem = config.cartradeInfo.fabric.submitter.certificate;
            const privateKeyPem = config.cartradeInfo.fabric.submitter.pkey;

            const { proposal, txId } = channel.generateUnsignedProposal(transactionProposalReq, config.cartradeInfo.fabric.mspID, certPem);
            logger.debug("proposal end");
            logger.debug(`##txId: ${txId.getTransactionID()}`);
            const signedProposal = signProposal(proposal.toBuffer(), privateKeyPem);

            const targets = [];
            for (let i = 0; i < config.cartradeInfo.fabric.peers.length; i++) {
                const peer = channel.getPeer(config.cartradeInfo.fabric.peers[i].requests.split("//")[1]);
                targets.push(peer);
            }
            const sendSignedProposalReq = { signedProposal, targets };
            const proposalResponses = await channel.sendSignedProposal(sendSignedProposalReq);
            logger.debug("successfully send signedProposal")
            let allGood: boolean = true;
            for (let i = 0; i < proposalResponses.length; i++) {
                let oneGood = false;
                if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
                    if (proposalResponses[i].response.payload) {
                        invokeResponse = new String(proposalResponses[i].response.payload);
                    }
                    oneGood = true;
                } else {
                    logger.debug('transaction proposal was bad');
                    const resStr = proposalResponses[0].toString();
                    const errMsg = resStr.replace("Error: ", "");
                    return reject(errMsg);
                }
                allGood = allGood && oneGood;
            }
            // If the return value of invoke is an empty string, store txID
            if (invokeResponse === "") {
                invokeResponse = txId.getTransactionID();
            }
            // Error if all peers do not return status 200
            if (!allGood) {
                throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
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
            logger.debug('Successfully build commit transaction proposal');

            // sign this commit proposal at local
            const signedCommitProposal = signProposal(commitProposal.toBuffer(), privateKeyPem);

            logger.debug('Successfully build endorse transaction proposal');
            logger.debug("##new param type##");
            const args: {} = {
                signedCommitProposal,
                commitReq
            };
            const result: { data: {}, txId: string } = {
                data: args,
                txId: txId.getTransactionID()
            }
            return resolve(result);
        } catch (e) {
            logger.error(`error at Invoke: err=${e}`);
            return reject(e);
        }
    });
}