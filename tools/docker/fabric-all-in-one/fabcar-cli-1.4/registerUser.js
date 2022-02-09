/*
 * SPDX-License-Identifier: Apache-2.0
 * Source: https://github.com/hyperledger/fabric-samples/releases/tag/v1.4.8
 */

"use strict";

const {
  FileSystemWallet,
  Gateway,
  X509WalletMixin,
} = require("fabric-network");
const path = require("path");

// EDIT - Changed config path
const ccpPath = "./connection.json";

async function main() {
  try {
    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), "wallet");
    const wallet = new FileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists("appUser");
    if (userExists) {
      console.log(
        'An identity for the user "appUser" already exists in the wallet',
      );
      return;
    }

    // Check to see if we've already enrolled the admin user.
    const adminExists = await wallet.exists("admin");
    if (!adminExists) {
      console.log(
        'An identity for the admin user "admin" does not exist in the wallet',
      );
      console.log("Run the enrollAdmin.js application before retrying");
      return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccpPath, {
      wallet,
      identity: "admin",
      discovery: { enabled: true, asLocalhost: true },
    });

    // Get the CA client object from the gateway for interacting with the CA.
    const ca = gateway.getClient().getCertificateAuthority();
    const adminIdentity = gateway.getCurrentIdentity();

    // Register the user, enroll the user, and import the new identity into the wallet.
    const secret = await ca.register(
      {
        affiliation: "org1.department1",
        enrollmentID: "appUser",
        role: "client",
      },
      adminIdentity,
    );
    const enrollment = await ca.enroll({
      enrollmentID: "appUser",
      enrollmentSecret: secret,
    });
    const userIdentity = X509WalletMixin.createIdentity(
      "Org1MSP",
      enrollment.certificate,
      enrollment.key.toBytes(),
    );
    await wallet.import("appUser", userIdentity);
    console.log(
      'Successfully registered and enrolled admin user "appUser" and imported it into the wallet',
    );
  } catch (error) {
    console.error(`Failed to register user "appUser": ${error}`);
    process.exit(1);
  }
}

main();
