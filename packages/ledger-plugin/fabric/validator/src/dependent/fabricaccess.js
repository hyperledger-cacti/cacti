/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * fabricaccess.js
 */

/*
 * Summary:
 * Request processing library for fabric v1.4.0
 */


//Dependent library
var SplugConfig = require('./PluginConfig.js');
var config = require('config');
var path = require('path');

//fabric client dependent library
var Fabric_Client = require('fabric-client');
var User = require('fabric-client/lib/User.js');
var copService = require('fabric-ca-client');

// list of fabric-client objects
var clients = {}

// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('fabricaccess[' + process.pid + ']');
logger.level = config.logLevel;

const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
//const path = require('path');

const ccpPath = path.resolve(__dirname, 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

const walletPath = path.resolve(__dirname, 'wallet');
const connUserName = SplugConfig.fabric.connUserName;
const channelName = SplugConfig.fabric.channelName;
const contractName = SplugConfig.fabric.contractName;

/*
 * Invoke function
 * @param reqBody	[json object]  {fcn:<Chain code function name>, args:[arg1>,<arg2>,,,]}
 *        isWait	[bool] true : returning a response after waiting for block generation
 * @return [string] Success: Chain code execution result
 *	 				Failure: Chain code error or internal error
*/
exports.Invoke = async function (reqBody, isWait) {
	var tx_id = null;
	var the_user = null;
	var eventhubs = [];
	var invokeResponse; //Return value from chain code

	try {
		logger.info('##fablicaccess: Invoke start');

		var fcn = reqBody.fcn;
		var args = reqBody.args;

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
			logger.error('Run the registerUser.js application before retrying');
		}

		// Create a new gateway for connecting to our peer node.
		const gateway = new Gateway();
		await gateway.connect(ccp, { wallet, identity: connUserName, discovery: { enabled: false } });

		// Get the network (channel) our contract is deployed to.
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(contractName);

		// Submit the specified transaction.
		logger.info(`##fablicaccess: Invoke Params: fcn=${fcn}, args0=${args[0]}, args1={args[1]}`);
		const transaction = contract.createTransaction(fcn);

		tx_id = transaction.getTransactionID().getTransactionID();
		logger.info('##fablicaccess: tx_id = ' + tx_id);

		const respData = await transaction.submit(args[0], args[1]);

		// const respData = await contract.submitTransaction(fcn, args[0], args[1]);
		logger.info('Transaction has been submitted');

		// Disconnect from the gateway.
		await gateway.disconnect();

	} catch (error) {
		logger.error(`Failed to submit transaction: ${error}`);
	}
}

/**
 * setup TLS for this client
 * @param {*} client 
 * @param {*} enrollmentID 
 * @param {*} secret 
 */
async function TLSSetup(client, enrollmentID, secret) {
	const tlsOptions = {
		trustedRoots: [],
		verify: false
	};
	logger.info("tlssetup start");
	const caService = new copService(SplugConfig.fabric.ca.url, tlsOptions, SplugConfig.fabric.ca.name);
	const req = {
		enrollmentID: enrollmentID,
		enrollmentSecret: secret,
		profile: 'tls'
	};
	const enrollment = await caService.enroll(req);
	client.setTlsClientCertAndKey(enrollment.certificate, enrollment.key.toBytes());
}

/**
 * Creating a channel object
 * @param {string} channelName 
 */
async function setupChannel(channelName) {
	logger.info("setupChannel start");
	const client = new Fabric_Client();
	await TLSSetup(client, SplugConfig.fabric.submitter.name, SplugConfig.fabric.submitter.secret);
	const channel = client.newChannel(channelName);

	for (var i = 0; i < SplugConfig.fabric.peers.length; i++) {
		var peer = client.newPeer(
			SplugConfig.fabric.peers[i].requests
		);
		channel.addPeer(peer);
	}

	const orderer = client.newOrderer(
		SplugConfig.fabric.orderer.url
	);
	channel.addOrderer(orderer);
	logger.info("setupChannel end");
	return channel;
}

/**
 * Function for InvokeSendSignedProposal
 * @param {*} signedCommitProposal 
 * @param {*} commitReq 
 * @return [string] Success: Chain code execution result
 * 				   Failure: Chain code error or internal error
 */
exports.InvokeSendSignedProposal = async function (signedCommitProposal, commitReq) {
	return new Promise(async function (resolve, reject) {
		logger.info("InvokeSendSignedProposal start");

		var invokeResponse; // Return value from chain code
		var channel; // Channel

		try {
			//channel object generation
			if (channel == undefined) {
				channel = await setupChannel(SplugConfig.fabric.channelName);
			}

			const response = await channel.sendSignedTransaction({
				signedProposal: signedCommitProposal,
				request: commitReq,
			});
			logger.info("successfully send signedCommitProposal");
			logger.info("response : " + JSON.stringify(response));
			if (response.status === 'SUCCESS') {
				invokeResponse = response;
				return resolve(invokeResponse);
			} else {
				throw new Error('Failed to order the transaction. Error code: ' + response.status);
			}
		} catch (e) {
			return reject(e);
		}
	});
}

// Get user object to send Proposal to EP
function getSubmitter(cli) {
	logger.info('##fabricaccess_getSubmitter');
	var caUrl = SplugConfig.fabric.ca.url;
	var caName = SplugConfig.fabric.ca.name;
	var submitter = SplugConfig.fabric.submitter;
	return cli.getUserContext(submitter.name, true)
		.then((user) => {

			return new Promise((resolve, reject) => {

				if (user && user.isEnrolled()) {
					return resolve(user);
				}
				var member = new User(submitter.name);
				var cryptoSuite = cli.getCryptoSuite();
				if (!cryptoSuite) {
					var storePath = path.join(__dirname, SplugConfig.fabric.keystore);
					cryptoSuite = Fabric_Client.newCryptoSuite();
					cryptoSuite.setCryptoKeyStore(
						Fabric_Client.newCryptoKeyStore({
							path: storePath
						})
					);
					cli.setCryptoSuite(cryptoSuite);
				}
				member.setCryptoSuite(cryptoSuite);

				var tlsOptions = {
					trustedRoots: [],
					verify: false
				};
				var cop = new copService(caUrl, tlsOptions, caName, cryptoSuite);
				return cop.enroll({
					enrollmentID: submitter.name,
					enrollmentSecret: submitter.secret
				}).then((enrollment) => {
					return member.setEnrollment(enrollment.key, enrollment.certificate, SplugConfig.fabric.mspid);
				}).then(() => {
					return cli.setUserContext(member, false);
				}).then(() => {
					return resolve(member);
				}).catch((err) => {
					return reject(err);
				});
			});
		});
}

// Export also for use with ServerMonitorPlugin
exports.GetSubmitter = function (cli) {
	return getSubmitter(cli);
}

// fabric-client and Channel object generation
function getClientAndChannel() {
	logger.info('##fabricaccess_getClientAndChannel');
	var retObj = { client: null, channel: null };
	var channelName = SplugConfig.fabric.channelName;
	// Since only one KVS can be set in the client, management in CA units as well as KVS path
	var isNewClient = false;
	var client = clients[SplugConfig.fabric.ca.name];
	if (!client) {
		logger.info('create new fabric-client');
		client = new Fabric_Client();
		clients[SplugConfig.fabric.ca.name] = client;
		isNewClient = true;
	}

	var channel = null;

	// * If getChannel of v1.0 SDK does not exist, an exception is returned instead of null, so try ~ catch
	//   Therefore, the error from Client.js will always be output in the log for the first time, but it is not harmful
	try {
		channel = client.getChannel(channelName);
	} catch (e) {
		if (channel == null) {
			logger.info('create new channel, name=' + channelName);
			channel = client.
				newChannel(channelName);
			var orderer = client.newOrderer(SplugConfig.fabric.orderer.url);
			channel.addOrderer(orderer);
			// EP settings
			for (var i = 0; i < SplugConfig.fabric.peers.length; i++) {
				var peer = client.newPeer(SplugConfig.fabric.peers[i].requests);
				channel.addPeer(peer);
			}
		} else {
			// Exception when reflecting connection destination information difference
			logger.error(e);
		}
	}
	retObj.channel = channel;

	return new Promise((resolve, reject) => {
		if (isNewClient) {
			//var storePath = "/tmp/" + SplugConfig.fabric.keystore;
			var storePath = SplugConfig.fabric.keystore;
			var cryptoSuite = Fabric_Client.newCryptoSuite();
			cryptoSuite.setCryptoKeyStore(
				Fabric_Client.newCryptoKeyStore({
					path: storePath
				})
			);
			client.setCryptoSuite(cryptoSuite);

			// Generate enrollment information storage location
			return Fabric_Client.newDefaultKeyValueStore({
				path: storePath
			})
				.then((store) => {
					// Set KeyValue Store
					client.setStateStore(store);
					retObj.client = client;
					resolve(retObj);
				})
		} else {
			retObj.client = client;
			resolve(retObj);
		}
	});
}

// Export also for use with ServerMonitorPlugin
exports.GetClientAndChannel = function () {
	return getClientAndChannel();
}