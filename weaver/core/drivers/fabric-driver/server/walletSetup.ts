/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wallets } from "fabric-network";
import FabricCAServices from "fabric-ca-client";
import { handlePromise } from "./utils";
import { InteroperableHelper } from "@hyperledger/cacti-weaver-sdk-fabric";
import * as path from "path";
import * as fs from "fs";
import logger from "./logger";

const getConfig = () => {
  const config = JSON.parse(
    fs
      .readFileSync(
        path.resolve(
          __dirname,
          process.env.DRIVER_CONFIG
            ? process.env.DRIVER_CONFIG
            : "../config.json",
        ),
      )
      .toString(),
  );
  return config;
};

const walletSetup = async (
  walletPath: string,
  conn_profile_path: string,
): Promise<any> => {
  const ccpPath = conn_profile_path
    ? path.resolve(__dirname, conn_profile_path)
    : path.resolve(__dirname, "../", "connection_profile.json");
  if (!fs.existsSync(ccpPath)) {
    logger.error(`File does not exist at path: ${ccpPath}`);
    logger.error(
      "Please check the CONNECTION_PROFILE environemnt variable in your .env. The path will default to the root of the fabric-driver folder if not supplied",
    );
    return;
  }
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
  const config = getConfig();
  // Create a new CA client for interacting with the CA.
  const org = ccp.client["organization"];
  logger.debug(`Org ${org}`);
  const caName = ccp.organizations[org]["certificateAuthorities"][0];
  logger.debug(`CA Name ${caName}`);
  const caURL = config.caUrl
    ? config.caUrl
    : ccp.certificateAuthorities[caName].url;
  logger.debug(`CA URL ${caURL}`);
  const ca = new FabricCAServices(caURL);
  const ident = ca.newIdentityService();
  logger.debug(ident);

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const adminName = config.admin.name;
  const adminSecret = config.admin.secret;
  // build a user object for authenticating with the CA        // Check to see if we've already enrolled the admin user.
  let adminIdentity = await wallet.get(adminName);

  if (adminIdentity) {
    logger.info(
      'An identity for the admin user "admin" already exists in the wallet',
    );
  } else {
    // Enroll the admin user, and import the new identity into the wallet.
    logger.debug(`Enrolling Admin... ${adminName}, ${adminSecret}`);
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
    logger.info(`Creating ${config.relay.name} Identity`);
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, adminName);
    const identity = await wallet.get(config.relay.name);
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
};

const getDriverKeyCert = async (): Promise<any> => {
  const walletPath = process.env.WALLET_PATH
    ? process.env.WALLET_PATH
    : path.join(
        process.cwd(),
        `wallet-${process.env.NETWORK_NAME ? process.env.NETWORK_NAME : "network1"}`,
      );
  const config = getConfig();
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  logger.info(`Wallet path: ${walletPath}, relay id: ${config.relay.name}`);

  const [keyCert, keyCertError] = await handlePromise(
    InteroperableHelper.getKeyAndCertForRemoteRequestbyUserName(
      wallet,
      config.relay.name,
    ),
  );
  if (keyCertError) {
    throw new Error(`Error getting key and cert ${keyCertError}`);
  }
  return keyCert;
};

export { walletSetup, getConfig, getDriverKeyCert };
