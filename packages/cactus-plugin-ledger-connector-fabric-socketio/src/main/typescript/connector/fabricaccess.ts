/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * fabricaccess.js
 */

/*
 * Summary:
 * Request processing library for fabric v1.4.0
 */

//Dependent library
import { SplugConfig } from "./PluginConfig";
import { config } from "../common/core/config/default";
const path = require("path");

//fabric client dependent library
const FabricClient = require("fabric-client");
const User = require("fabric-client/lib/User.js");
const copService = require("fabric-ca-client");

// list of fabric-client objects
const clients = {};

// Log settings
import { getLogger } from "log4js";
const logger = getLogger("fabricaccess[" + process.pid + "]");
logger.level = config.logLevel;

// Get user object to send Proposal to EP
function getSubmitter(cli) {
  logger.info("##fabricaccess_getSubmitter");
  const caUrl = SplugConfig.fabric.ca.url;
  const caName = SplugConfig.fabric.ca.name;
  const submitter = SplugConfig.fabric.submitter;
  return cli.getUserContext(submitter.name, true).then((user) => {
    return new Promise((resolve, reject) => {
      if (user && user.isEnrolled()) {
        return resolve(user);
      }
      const member = new User(submitter.name);
      let cryptoSuite = cli.getCryptoSuite();
      if (!cryptoSuite) {
        const storePath = path.join(__dirname, SplugConfig.fabric.keystore);
        cryptoSuite = FabricClient.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(
          FabricClient.newCryptoKeyStore({
            path: storePath,
          })
        );
        cli.setCryptoSuite(cryptoSuite);
      }
      member.setCryptoSuite(cryptoSuite);

      const tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      const cop = new copService(caUrl, tlsOptions, caName, cryptoSuite);
      return cop
        .enroll({
          enrollmentID: submitter.name,
          enrollmentSecret: submitter.secret,
        })
        .then((enrollment) => {
          return member.setEnrollment(
            enrollment.key,
            enrollment.certificate,
            SplugConfig.fabric.mspid
          );
        })
        .then(() => {
          return cli.setUserContext(member, false);
        })
        .then(() => {
          return resolve(member);
        })
        .catch((err) => {
          return reject(err);
        });
    });
  });
}

// Export also for use with ServerMonitorPlugin
exports.GetSubmitter = function (cli) {
  return getSubmitter(cli);
};

// fabric-client and Channel object generation
function getClientAndChannel() {
  logger.info("##fabricaccess_getClientAndChannel");
  const retObj = { client: null, channel: null };
  const channelName = SplugConfig.fabric.channelName;
  // Since only one KVS can be set in the client, management in CA units as well as KVS path
  let isNewClient = false;
  let client = clients[SplugConfig.fabric.ca.name];
  if (!client) {
    logger.info("create new fabric-client");
    client = new FabricClient();
    clients[SplugConfig.fabric.ca.name] = client;
    isNewClient = true;
  }

  let channel = null;

  // * If getChannel of v1.0 SDK does not exist, an exception is returned instead of null, so try ~ catch
  //   Therefore, the error from Client.js will always be output in the log for the first time, but it is not harmful
  try {
    channel = client.getChannel(channelName);
  } catch (e) {
    if (channel == null) {
      logger.info("create new channel, name=" + channelName);
      channel = client.newChannel(channelName);
      const orderer = client.newOrderer(SplugConfig.fabric.orderer.url);
      channel.addOrderer(orderer);
      // EP settings
      for (let i = 0; i < SplugConfig.fabric.peers.length; i++) {
        const peer = client.newPeer(SplugConfig.fabric.peers[i].requests);
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
      const storePath = SplugConfig.fabric.keystore;
      const cryptoSuite = FabricClient.newCryptoSuite();
      cryptoSuite.setCryptoKeyStore(
        FabricClient.newCryptoKeyStore({
          path: storePath,
        })
      );
      client.setCryptoSuite(cryptoSuite);

      // Generate enrollment information storage location
      return FabricClient.newDefaultKeyValueStore({
        path: storePath,
      }).then((store) => {
        // Set KeyValue Store
        client.setStateStore(store);
        retObj.client = client;
        resolve(retObj);
      });
    } else {
      retObj.client = client;
      resolve(retObj);
    }
  });
}

// Export also for use with ServerMonitorPlugin
exports.GetClientAndChannel = function () {
  return getClientAndChannel();
};
