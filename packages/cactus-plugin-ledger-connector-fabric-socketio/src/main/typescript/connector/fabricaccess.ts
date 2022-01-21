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
import fs from "fs";

//fabric client dependent library
import FabricClient, { User } from "fabric-client";
import copService, { TLSOptions } from "fabric-ca-client";

// list of fabric-client objects
const clients = {};

// Log settings
import { getLogger } from "log4js";
const logger = getLogger("fabricaccess[" + process.pid + "]");
logger.level = config.logLevel;

// Get user object to send Proposal to EP
export function getSubmitterAndEnroll(cli: FabricClient): Promise<User> {
  logger.info("##fabricaccess_getSubmitter");
  const caUrl = SplugConfig.fabric.ca.url;
  const caName = SplugConfig.fabric.ca.name;
  const submitter = SplugConfig.fabric.submitter;
  // Returns Promise<User> when checkPersistence is true (poor typing)
  return (cli.getUserContext(submitter.name, true) as Promise<User>).then(
    (user) => {
      return new Promise((resolve, reject) => {
        if (user && user.isEnrolled()) {
          return resolve(user);
        }
        const member = new User(submitter.name);
        let cryptoSuite = cli.getCryptoSuite();
        if (!cryptoSuite) {
          const storePath = path.join(
            SplugConfig.fabric.keystore,
            submitter.name,
          );
          cryptoSuite = FabricClient.newCryptoSuite();
          cryptoSuite.setCryptoKeyStore(
            FabricClient.newCryptoKeyStore({
              path: storePath,
            }),
          );
          cli.setCryptoSuite(cryptoSuite);
        }
        member.setCryptoSuite(cryptoSuite);

        const tlsOptions: TLSOptions = {
          trustedRoots: Buffer.from([]),
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
              SplugConfig.fabric.mspid,
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
    },
  );
}

// fabric-client and Channel object generation
export async function getClientAndChannel(
  channelName = SplugConfig.fabric.channelName,
) {
  logger.info("##fabricaccess_getClientAndChannel");
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
      const ordererCA = fs.readFileSync(
        SplugConfig.fabric.orderer.tlsca,
        "utf8",
      );
      const orderer = client.newOrderer(SplugConfig.fabric.orderer.url, {
        pem: ordererCA,
        "ssl-target-name-override": SplugConfig.fabric.orderer.name,
      });
      channel.addOrderer(orderer);
      // EP settings
      for (let i = 0; i < SplugConfig.fabric.peers.length; i++) {
        const peerCA = fs.readFileSync(
          SplugConfig.fabric.peers[i].tlsca,
          "utf8",
        );
        const peer = client.newPeer(SplugConfig.fabric.peers[i].requests, {
          pem: peerCA,
          "ssl-target-name-override": SplugConfig.fabric.peers[i].name,
        });
        channel.addPeer(peer, SplugConfig.fabric.mspid);
      }

      const storePath = path.join(
        SplugConfig.fabric.keystore,
        SplugConfig.fabric.submitter.name,
      );
      const cryptoSuite = FabricClient.newCryptoSuite();
      cryptoSuite.setCryptoKeyStore(
        FabricClient.newCryptoKeyStore({
          path: storePath,
        }),
      );
      client.setCryptoSuite(cryptoSuite);

      // Generate enrollment information storage location
      let store = await FabricClient.newDefaultKeyValueStore({
        path: storePath,
      });
      client.setStateStore(store);
    } else {
      // Exception when reflecting connection destination information difference
      logger.error(e);
    }
  }

  return { client, channel };
}