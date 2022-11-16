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
import { configRead } from "@hyperledger/cactus-cmd-socketio-server";
const path = require("path");
import fs from "fs";

//fabric client dependent library
import FabricClient, { User } from "fabric-client";
import copService, { TLSOptions } from "fabric-ca-client";

// list of fabric-client objects
const clients = new Map<string, FabricClient>();

// Log settings
import { getLogger } from "log4js";
const logger = getLogger("fabricaccess[" + process.pid + "]");
logger.level = configRead<string>("logLevel", "info");

// Get user object to send Proposal to EP
export function getSubmitterAndEnroll(cli: FabricClient): Promise<User> {
  logger.info("##fabricaccess_getSubmitter");
  const caUrl = configRead<string>("fabric.ca.url");
  const caName = configRead<string>("fabric.ca.name");
  // Returns Promise<User> when checkPersistence is true (poor typing)
  return (cli.getUserContext(
    configRead<string>("fabric.submitter.name"),
    true,
  ) as Promise<User>).then((user) => {
    return new Promise((resolve, reject) => {
      if (user && user.isEnrolled()) {
        return resolve(user);
      }
      const member = new User(configRead<string>("fabric.submitter.name"));
      let cryptoSuite = cli.getCryptoSuite();
      if (!cryptoSuite) {
        const storePath = path.join(
          configRead<string>("fabric.keystore"),
          configRead<string>("fabric.submitter.name"),
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
          enrollmentID: configRead<string>("fabric.submitter.name"),
          enrollmentSecret: configRead<string>("fabric.submitter.secret"),
        })
        .then((enrollment) => {
          return member.setEnrollment(
            enrollment.key,
            enrollment.certificate,
            configRead<string>("fabric.mspid"),
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

// fabric-client and Channel object generation
export async function getClientAndChannel(
  channelName = configRead<string>("fabric.channelName"),
) {
  logger.info("##fabricaccess_getClientAndChannel");
  // Since only one KVS can be set in the client, management in CA units as well as KVS path
  let isNewClient = false;
  let client = clients.get(configRead<string>("fabric.ca.name"));
  if (!client) {
    logger.info("create new fabric-client");
    client = new FabricClient();
    clients.set(configRead<string>("fabric.ca.name"), client);
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

      let ordererCA: string;
      try {
        ordererCA = configRead<string>('fabric.orderer.tlscaValue');
      } catch {
        ordererCA = fs.readFileSync(configRead('fabric.orderer.tlsca'), 'ascii');
      }

      const orderer = client.newOrderer(
        configRead<string>("fabric.orderer.url"),
        {
          pem: ordererCA,
          "ssl-target-name-override": configRead<string>(
            "fabric.orderer.name",
          ),
        },
      );
      channel.addOrderer(orderer);
      // EP settings
      const peersConfig = configRead<any[]>("fabric.peers");
      for (let i = 0; i < peersConfig.length; i++) {
        let peerCA: string;
        if ("tlscaValue" in peersConfig[i]) {
          peerCA = peersConfig[i].tlscaValue;
        } else {
          peerCA = fs.readFileSync(peersConfig[i].tlsca, 'ascii');
        }

        const peer = client.newPeer(peersConfig[i].requests, {
          pem: peerCA,
          "ssl-target-name-override": peersConfig[i].name,
        });

        channel.addPeer(peer, configRead<string>("fabric.mspid"));
      }

      const storePath = path.join(
        configRead<string>("fabric.keystore"),
        configRead<string>("fabric.submitter.name"),
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
