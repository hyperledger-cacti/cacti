/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * signTransactionOffline.js
 */

////////
// Usage
// TODO: 
//
////////

/* Summary:
 * Request library for fabric v1.4.0 (for offline signature) Processing library Testing library
 * In this case, it is used only when transferring assets.
*/

// For reading keys and certificates
const fs = require('fs');
const path = require('path');

//Constant definition
const config = require('./PluginConfig.js');

//Fabric node-sdk
const FabricCAService = require('fabric-ca-client');
const Client = require('fabric-client');

//Cryptographic
const hash = require('fabric-client/lib/hash');
const jsrsa = require('jsrsasign');
const { KEYUTIL } = jsrsa;
const elliptic = require('elliptic');
const EC = elliptic.ec;

// TODO: 
const walletPath = path.resolve(__dirname, 'wallet');

//Key and certificate issued by msp (User1@example.com)
const basic_network_path = "/home/kanazashi/workspace/fabric-samples/basic-network";
const privateKeyPath0 = basic_network_path + '/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/c75bd6911aca808941c3557ee7c97e90f3952e379497dc55eb903f31b50abc83_sk';
const privateKeyPem0 = fs.readFileSync(privateKeyPath0, 'utf8');
const certPath0 = basic_network_path + '/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem';
const certPem0 = fs.readFileSync(certPath0, 'utf8');

// Keys and certificates issued by Fabric-CA (STM administrator, general user)
const privateKeyPath = walletPath + '/admin/b4acea028a4641fc938b7eb9ed00fa21496ed5471656c3d80d9bb637bdc6ea3f-priv';
const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
const certPath = walletPath + '/admin/admin';
const work = fs.readFileSync(certPath, 'utf8'); //For E-cert issued by Fabric-CA, parsing is required once
const certPem = JSON.parse(work).enrollment.identity.certificate;

const mspId = config.fabric.mspid;


function json2str(jsonObj) {
    try {
        return JSON.stringify(jsonObj);
    }
    catch (error) {
        return null;
    }
}


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

function signProposal(proposalBytes, privateKeyPem) {
    console.log("signProposal start");

    const signature = sign(privateKeyPem, proposalBytes, 'sha2', 256);
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
    console.log("tlssetup start");
    const caService = new FabricCAService(config.fabric.ca.url, tlsOptions, config.fabric.ca.name);
    const req = {
        enrollmentID: enrollmentID,
        enrollmentSecret: secret,
        profile: 'tls'
    };
    const enrollment = await caService.enroll(req);
    client.setTlsClientCertAndKey(enrollment.certificate, enrollment.key.toBytes());
}


//Creating a channel object
async function setupChannel(channelName) {
    console.log("setupChannel start");
    const client = new Client();
    await TLSSetup(client, config.fabric.submitter.name, config.fabric.submitter.secret);
    const channel = client.newChannel(channelName);

    //add peer to channel
    //const peerTLSCertPath = path.resolve(__dirname, './crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tlscacerts/org1.example.com-cert.pem');
    //const peerPEMCert = fs.readFileSync(peerTLSCertPath, 'utf8');
    for (var i = 0; i < config.fabric.peers.length; i++) {
        var peer = client.newPeer(
            config.fabric.peers[i].requests
			/*{
				pem: peerPEMCert,
				'ssl-target-name-override': 'peer0.org1.example.com',
			}
			*/
        );
        channel.addPeer(peer);
    }

    //add orderer to channel
	/*
	const ordererTLSCertPath = path.resolve(__dirname, './crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tlscacerts/example.com-cert.pem');
	const ordererPEMCert = fs.readFileSync(ordererTLSCertPath, 'utf8');
	*/
    const orderer = client.newOrderer(
        config.fabric.orderer.url
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


//Monitor for block commit monitoring
async function transactionMonitor(txId, eh, invokeResponse) {
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            console.log('Timeout - Failed to receive event for txId ' + txId);
            eh.disconnect(); // shutdown
            throw new Error('TIMEOUT - no event received');
        }, 60000);

        eh.registerTxEvent(txId, (txnid, code, block_num) => {
            clearTimeout(handle);
            console.log('Event has been seen with transaction code:' + code + ' for transaction id:' + txnid + ' for block_num:' + block_num);
            resolve(invokeResponse);
        }, (error) => {
            clearTimeout(handle);
            console.log('Failed to receive event replay for Event for transaction id ::' + txId);
            reject(error);
        }, { disconnect: true }
            // Setting the disconnect to true as we do not want to use this
            // ChannelEventHub after the event we are looking for comes in
        );
        console.log('Successfully registered event for ' + txId);

        //Signature processing is also required when monitoring Event
        // However, the key used for the signature here is that of the user (User1@example.com) issued by msp.
        const unsignedEvent = eh.generateUnsignedRegistration({
            certificate: certPem0,
            mspId,
        });
        const signedProposal = signProposal(unsignedEvent, privateKeyPem0);
        const signedEvent = {
            signature: signedProposal.signature,
            payload: signedProposal.proposal_bytes,
        };
        eh.connect({ signedEvent });

        console.log('Successfully called connect on ' + eh.getPeerAddr());
    });
}


// The following three signatures are required when sending transactions and monitoring block commits.
// Endorsement, Commit -> Signed by STM user. Request a signature from the authorization/signature server.
// RegisterChannelEventHub -> Signed by msp user (User1@example.com)
async function Invoke(reqBody, isWait) {
    // exports.Invoke = async function(reqBody, isWait){
    //var eventhubs = []; //For the time being, give up the eventhub connection of multiple peers.
    var invokeResponse; //Return value from chain code
    var channel;
    var eh; //EventHub

    return new Promise(async function (resolve, reject) {
        try {
            //channel object generation
            if (channel == undefined) {
                channel = await setupChannel(config.fabric.channelName);
            }

			/*
			*  Endorse step
			*/
            const transactionProposalReq = {
                fcn: reqBody.fcn,						//Chain code function name
                args: reqBody.args,						//Chaincode argument
                chaincodeId: 'fabcar',
                channelId: config.fabric.channelName,
            };
            console.log(transactionProposalReq);
            const { proposal, txId } = channel.generateUnsignedProposal(transactionProposalReq, config.fabric.mspid, certPem);
            console.log("proposal end");
            console.log(`##txId=${txId.getTransactionID()}`);
            const signedProposal = signProposal(proposal.toBuffer(), privateKeyPem);
            console.log('Successfully build endorse transaction proposal');

            var targets = [];
            for (var i = 0; i < config.fabric.peers.length; i++) {
                var peer = channel.getPeer(config.fabric.peers[i].requests.split("//")[1]);
                targets.push(peer);
            }
            const sendSignedProposalReq = { signedProposal, targets };
            const proposalResponses = await channel.sendSignedProposal(sendSignedProposalReq);
            console.log("successfully send signedProposal")
            var all_good = true;
            for (var i in proposalResponses) {
                let one_good = false;
                if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
                    if (proposalResponses[i].response.payload) {
                        invokeResponse = new String(proposalResponses[i].response.payload);
                    }
                    one_good = true;
                } else {
                    console.log('transaction proposal was bad');
                    var resStr = proposalResponses[0].toString();
                    var errMsg = resStr.replace("Error: ", "");
                    return reject(errMsg);
                }
                all_good = all_good & one_good;
            }
            //If the return value of invoke is an empty string, store txID
            if (invokeResponse == "") {
                invokeResponse = txId.getTransactionID();
            }
            //Error if all peers do not return status 200
            if (!all_good) {
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
            console.log('Successfully build commit transaction proposal');

            // sign this commit proposal at local
            const signedCommitProposal = signProposal(commitProposal.toBuffer(), privateKeyPem);

            const response = await channel.sendSignedTransaction({
                signedProposal: signedCommitProposal,
                request: commitReq,
            });
            console.log("successfully send signedCommitProposal");
            console.log(response);
            if (response.status === 'SUCCESS') {
                if (!isWait) {
                    // If you do not want to wait for block generation, resolve here
                    return resolve(invokeResponse);
                }
            } else {
                throw new Error('Failed to order the transaction. Error code: ' + response.status);
            }

			/*
			* Monitor block commit (EventHub generated. Currently one peer)
			*/
            //TODO: push to eventhubs
            eh = channel.newChannelEventHub(peer);
            const res = await transactionMonitor(txId.getTransactionID(), eh, invokeResponse);
            console.log("block created");
            console.log(res);
            //When waiting for block generation, resolve here
            return resolve(res);

        } catch (e) {
            // Disconnect from EventHub server
            if (eh != undefined) {
                if (eh.isconnected()) {
                    console.log('Disconnecting the event hub');
                    eh.disconnect();
                }
                console.error(e);
            } else {
                console.error(e);
            }
            return reject(e);
        }
    });
}

var ret_obj = {};
var carId = "CAR12";
var newOwner = 'Dave#_A';
if (carId == undefined || newOwner == undefined) {
    var emsg = "Insufficient parameters.";
    logger.info(emsg);
    return;
}
var reqparam = { fcn: "changeCarOwner", args: [carId, newOwner] };

Invoke(reqparam, true)
    .then((returnvalue) => {
        console.log('success : ' + returnvalue);
    }).catch(err => {
        console.log('failed : ' + err);
    });
