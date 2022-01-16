/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * testDriver_sendSignedProposal.js
 */

////////
// Usage
//
////////

/* Summary:
 * Request library for fabric v1.4.0 (for offline signature) Processing library Testing library
 * In this case, it is used only when transferring assets.
 */

// For reading keys and certificates
const fs = require("fs");
const path = require("path");
const httpRequest = require("request");
var config = require("config");

//Fabric node-sdk
const FabricCAService = require("fabric-ca-client");
const Client = require("fabric-client");

//Cryptographic
const hash = require("fabric-client/lib/hash");
const jsrsa = require("jsrsasign");
const { KEYUTIL } = jsrsa;
const elliptic = require("elliptic");
const EC = elliptic.ec;

const walletPath = path.resolve(__dirname, "wallet");

//Key and certificate issued by msp (User1@example.com)
const basicNetworkPath = "/xxxxx/xxxx/unit-test/fabric-docker/basic-network";
const privateKeyPath0 =
  basicNetworkPath +
  "/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/c75bd6911aca808941c3557ee7c97e90f3952e379497dc55eb903f31b50abc83_sk";
const privateKeyPem0 = fs.readFileSync(privateKeyPath0, "utf8");
const certPath0 =
  basicNetworkPath +
  "/crypto-config/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem";
const certPem0 = fs.readFileSync(certPath0, "utf8");

// Keys and certificates issued by Fabric-CA (STM administrator, general user)
const privateKeyPath =
  walletPath +
  "/admin/6872965e4870c3ab435769ceef8ecc5783b7c670a2c0572b6345cf91af1e43aa-priv";
const privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");
const certPath = walletPath + "/admin/admin";
const work = fs.readFileSync(certPath, "utf8"); //For E-cert issued by Fabric-CA, parsing is required once
const certPem = JSON.parse(work).enrollment.identity.certificate;

const mspId = config.fabric.mspid;

// ## Request for "changeCarOwner"
var carId = "CAR101";
var newOwner = "Charlie111";

var func = "changeCarOwner";
var args = {
  carId: carId,
  newOwner: newOwner,
};

// function param
var requestData = {
  func: func,
  args: args,
};

function json2str(jsonObj) {
  try {
    return JSON.stringify(jsonObj);
  } catch (error) {
    return null;
  }
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
function _preventMalleability(sig, curveParams) {
  const halfOrder = ordersForCurve[curveParams.name].halfOrder;
  if (!halfOrder) {
    throw new Error(
      'Can not find the half order needed to calculate "s" value for immalleable signatures. Unsupported curve name: ' +
        curveParams.name
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
  sig = _preventMalleability(sig, key.ecparams);

  return Buffer.from(sig.toDER());
}

function signProposal(proposalBytes, paramPrivateKeyPem) {
  console.log("signProposal start");

  const signature = sign(paramPrivateKeyPem, proposalBytes, "sha2", 256);
  const signedProposal = { signature, proposal_bytes: proposalBytes };
  return signedProposal;
}

// END Signature process=========================================================================================

// setup TLS for this client
async function TLSSetup(client, enrollmentID, secret) {
  const tlsOptions = {
    trustedRoots: [],
    verify: false,
  };
  console.log("tlssetup start");
  const caService = new FabricCAService(
    config.fabric.ca.url,
    tlsOptions,
    config.fabric.ca.name
  );
  const req = {
    enrollmentID: enrollmentID,
    enrollmentSecret: secret,
    profile: "tls",
  };
  const enrollment = await caService.enroll(req);
  client.setTlsClientCertAndKey(
    enrollment.certificate,
    enrollment.key.toBytes()
  );
}

//Creating a channel object
async function setupChannel(channelName) {
  console.log("setupChannel start");
  const client = new Client();
  await TLSSetup(
    client,
    config.fabric.submitter.name,
    config.fabric.submitter.secret
  );
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
        fcn: reqBody.func, //Chain code function name
        args: [reqBody.args.carId, reqBody.args.newOwner], //Chaincode argument
        chaincodeId: "fabcar",
        channelId: config.fabric.channelName,
      };
      console.log(transactionProposalReq);
      const { proposal, txId } = channel.generateUnsignedProposal(
        transactionProposalReq,
        config.fabric.mspid,
        certPem
      );
      console.log("proposal end");
      console.log(`##txId: ${txId.getTransactionID()}`);
      const signedProposal = signProposal(proposal.toBuffer(), privateKeyPem);

      var targets = [];
      for (let i = 0; i < config.fabric.peers.length; i++) {
        var peer = channel.getPeer(
          config.fabric.peers[i].requests.split("//")[1]
        );
        targets.push(peer);
      }
      const sendSignedProposalReq = { signedProposal, targets };
      const proposalResponses = await channel.sendSignedProposal(
        sendSignedProposalReq
      );
      console.log("successfully send signedProposal");
      var allGood = true;
      for (let i in proposalResponses) {
        let oneGood = false;
        if (
          proposalResponses &&
          proposalResponses[i].response &&
          proposalResponses[i].response.status === 200
        ) {
          if (proposalResponses[i].response.payload) {
            invokeResponse = new String(proposalResponses[i].response.payload);
          }
          oneGood = true;
        } else {
          console.log("transaction proposal was bad");
          var resStr = proposalResponses[0].toString();
          var errMsg = resStr.replace("Error: ", "");
          return reject(errMsg);
        }
        allGood = allGood & oneGood;
      }
      //If the return value of invoke is an empty string, store txID
      if (invokeResponse == "") {
        invokeResponse = txId.getTransactionID();
      }
      //Error if all peers do not return status 200
      if (!allGood) {
        throw new Error(
          "Failed to send Proposal or receive valid response. Response null or status is not 200. exiting..."
        );
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
      console.log("Successfully build commit transaction proposal");

      // sign this commit proposal at local
      const signedCommitProposal = signProposal(
        commitProposal.toBuffer(),
        privateKeyPem
      );

      console.log("Successfully build endorse transaction proposal");
      console.log("##new param type##");
      var retRequestData = {
        func: "sendSignedProposal",
        //args : [signedCommitProposal, commitReq]
        args: {
          signedCommitProposal: signedCommitProposal,
          commitReq: commitReq,
          //signedCommitProposal: "aaa",
          //commitReq: "bbb"
        },
      };
      return resolve(retRequestData);
    } catch (e) {
      console.log(`error at Invoke: err=${e}`);
      return reject(e);
    }
  });
}

function sendRequest() {
  //
  console.log("exec sendRequest()");
  console.log("#[send]requestData: " + json2str(requestData));
  Invoke(requestData, true)
    .then((returnvalue) => {
      //console.log('success : ' + json2str(returnvalue));

      // call WebAPI
      console.log("##call WebAPI");
      var param = {
        apiType: returnvalue.func,
        data: {
          signedCommitProposal: returnvalue.args["signedCommitProposal"],
          commitReq: returnvalue.args["commitReq"],
        },
      };
      var httpTarget = "http://localhost:5000/validatorDriver";
      var body = {
        validator: "fabric",
        func: "requestLedgerOperation",
        param: param,
      };
      console.log("##url : " + httpTarget);
      const httpOptions = {
        url: httpTarget,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          //  'Content-Length': Buffer.byteLength(param)
        },
        json: body,
      };

      httpRequest(httpOptions, (error, response, body) => {
        if (error !== null) {
          console.log("error:", error);
          return false;
        }
        console.log("statusCode:", response && response.statusCode);
        console.log("body:", body);
      });
    })
    .catch((err) => {
      console.log("failed : " + err);
    });
}

setTimeout(sendRequest, 1000);
