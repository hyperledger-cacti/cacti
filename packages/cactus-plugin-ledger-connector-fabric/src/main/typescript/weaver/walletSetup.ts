/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wallet, Wallets } from "fabric-network";
import FabricCAServices from "fabric-ca-client";
import { handlePromise } from "./utils";
import {
  ILoggerOptions,
  LoggerProvider,
  LogLevelDesc,
} from "@hyperledger/cactus-common";
import FabCommon from "fabric-common";
import { ConnectionProfile } from "../public-api";
import { DriverConfig } from "./fabric-driver-server";

export async function walletSetup(
  walletPath: string,
  ccp: ConnectionProfile,
  config: DriverConfig,
  logLevel: LogLevelDesc = "INFO",
): Promise<any> {
  const loggerOptions: ILoggerOptions = {
    level: logLevel,
    label: "walletSetup",
  };
  const logger = LoggerProvider.getOrCreate(loggerOptions);

  // Create a new CA client for interacting with the CA.
  if (!ccp) {
    logger.error("No connection profile provided");
    throw new Error("No connection profile provided");
  }

  if (!ccp.client) {
    logger.error("No client section in the connection profile");
    throw new Error("No client section in the connection profile");
  }
  const org = ccp.client["organization"];
  logger.debug(`Org ${org}`);

  if (!org) {
    logger.error("No organization provided in the connection profile");
    throw new Error("No organization provided in the connection profile");
  }
  if (!ccp.organizations) {
    logger.error("No organizations section in the connection profile");
    throw new Error("No organizations section in the connection profile");
  }
  const caName = ccp.organizations[org]["certificateAuthorities"][0];
  logger.debug(`CA Name ${caName}`);

  let caURL;

  if (config.caUrl !== undefined && config.caUrl != "") {
    caURL = config.caUrl;
  } else {
    logger.debug("Getting CA URL from connection profile");
    if (ccp.certificateAuthorities === undefined) {
      logger.error(
        "No certificateAuthorities section in the connection profile",
      );
      throw new Error(
        "No certificateAuthorities section in the connection profile",
      );
    }
    caURL = ccp.certificateAuthorities[caName].url;
  }
  logger.debug(`CA URL: ${caURL}`);
  const ca = new FabricCAServices(caURL);
  const ident = ca.newIdentityService();
  logger.debug(ident);

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const adminName = config?.admin?.name;
  const adminSecret = config?.admin?.secret;
  // build a user object for authenticating with the CA        // Check to see if we've already enrolled the admin user.
  if (!adminName) {
    logger.error("No admin name provided in the config");
    throw new Error("No admin name provided in the config");
  }
  let adminIdentity = await wallet.get(adminName);

  if (adminIdentity) {
    logger.info(
      'An identity for the admin user "admin" already exists in the wallet',
    );
  } else {
    // Enroll the admin user, and import the new identity into the wallet.
    logger.debug(`Enrolling Admin... ${adminName}, ${adminSecret}`);
    if (!adminSecret) {
      logger.error("No admin secret provided in the config");
      throw new Error("No admin secret provided in the config");
    }
    if (!config.mspId) {
      logger.error("No mspId provided in the config");
      throw new Error("No mspId provided in the config");
    }
    const enrollment = await ca.enroll({
      enrollmentID: adminName,
      enrollmentSecret: adminSecret,
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: config.mspId,
      type: "X.509",
    };
    await wallet.put(adminName, x509Identity);
    adminIdentity = await wallet.get(adminName);
  }
  if (adminIdentity) {
    if (!config.relay) {
      logger.error("No relay config provided");
      throw new Error("No relay config provided");
    }
    logger.info(`Creating ${config.relay.name} Identity`);
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminName);

    if (!config.relay.name) {
      logger.error("No relay name provided in the config");
      throw new Error("No relay name provided in the config");
    }
    const identity = await wallet.get(config.relay.name);

    if (!config.relay.affiliation) {
      logger.error("No relay affiliation provided in the config");
      throw new Error("No relay affiliation provided in the config");
    }
    if (!config.relay.attrs) {
      logger.error("No relay attrs provided in the config");
      throw new Error("No relay attrs provided in the config");
    }
    if (!identity) {
      const secret = await ca.register(
        {
          affiliation: config.relay.affiliation,
          enrollmentID: config.relay.name,
          role: config.relay.role,
          attrs: config.relay.attrs,
        },
        adminUser,
      );
      const enrollment = await ca.enroll({
        enrollmentID: config.relay.name,
        enrollmentSecret: secret,
      });
      if (!config.mspId) {
        logger.error("No mspId provided in the config");
        throw new Error("No mspId provided in the config");
      }
      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: config.mspId,
        type: "X.509",
      };
      await wallet.put(config.relay.name, x509Identity);
      logger.info(`${config.relay.name} Identity Created`);
    } else {
      logger.info(`${config.relay.name} Identity Already exists`);
    }

    return wallet;
  } else {
    logger.error("Admin was not registered");
    throw new Error("Admin was not registered");
  }
}

export async function getDriverKeyCert(
  wallet: Wallet,
  config: DriverConfig,
): Promise<any> {
  const loggerOptions: ILoggerOptions = {
    level: "INFO",
    label: "getDriverKeyCert",
  };
  const logger = LoggerProvider.getOrCreate(loggerOptions);

  if (!config.relay) {
    logger.error("No relay config provided");
    throw new Error("No relay config provided");
  }

  logger.info(`relay id: ${config.relay.name}`);

  const [keyCert, keyCertError] = await handlePromise(
    getKeyAndCertForRemoteRequestbyUserName(wallet, config.relay.name),
  );
  if (keyCertError) {
    throw new Error(`Error getting key and cert ${keyCertError}`);
  }
  return keyCert;
}

// TODO: Lookup different key and cert pairs for different networks and chaincode functions
/**
 * Generate key pair and obtain certificate from CA (MSP)
 **/
async function getKeyAndCertForRemoteRequestbyUserName(
  wallet: any,
  username: any,
) {
  if (!wallet) {
    throw new Error("No wallet passed");
  }
  if (!username) {
    throw new Error("No username passed");
  }
  const identity = await wallet.get(username);
  if (!identity) {
    throw new Error(`Identity for username ${username} not present in wallet`);
  }
  // Assume the identity is of type 'fabric-network.X509Identity'
  const privKey = FabCommon.Utils.newCryptoSuite().createKeyFromRaw(
    identity.credentials.privateKey,
  );
  return { key: privKey, cert: identity.credentials.certificate };
}
