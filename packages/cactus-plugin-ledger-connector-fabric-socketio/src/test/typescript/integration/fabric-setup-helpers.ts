/**
 * Fabric helpers to be used by functional tests.
 * Works with Fabric SDK 1.4 - that's why it's not included in fabric ledger test class.
 * Most functions are based on fabric-samples and utils scripts from tools/docker/fabric-all-in-one/asset-transfer-basic-utils
 */

import { LoggerProvider, Logger } from "@hyperledger/cactus-common";
import { FileSystemWallet, Gateway, X509WalletMixin } from "fabric-network";
import FabricCAServices from "fabric-ca-client";

// Unit Test logger setup
const log: Logger = LoggerProvider.getOrCreate({
  label: "fabric-setup-helpers",
  level: "info",
});

/**
 * Enroll admin user on fabric and store it's credential in local filesystem wallet.
 *
 * @param connectionProfile - Fabric connection profile JSON.
 * @param walletPath - Local filesystem wallet path.
 * @param enrollmentID - admin username.
 * @param enrollmentSecret - admin secret.
 */
export async function enrollAdmin(
  connectionProfile: any,
  walletPath: string,
  enrollmentID: string,
  enrollmentSecret: string,
) {
  log.info(
    `Enroll admin user with enrollmentID='${enrollmentID}' and enrollmentSecret='${enrollmentSecret}'`,
  );

  // Create a new CA client for interacting with the CA.
  const caName = connectionProfile.organizations.Org1.certificateAuthorities[0];
  const caInfo = connectionProfile.certificateAuthorities[caName];
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const ca = new FabricCAServices(
    caInfo.url,
    { trustedRoots: caTLSCACerts, verify: false },
    caInfo.caName,
  );

  // Create a new file system based wallet for managing identities.
  const wallet = new FileSystemWallet(walletPath);

  // Enroll admin user if not exist yet
  const adminExists = await wallet.exists(enrollmentID);
  if (!adminExists) {
    const enrollment = await ca.enroll({
      enrollmentID,
      enrollmentSecret,
    });
    const identity = X509WalletMixin.createIdentity(
      connectionProfile.organizations.Org1.mspid,
      enrollment.certificate,
      enrollment.key.toBytes(),
    );
    await wallet.import(enrollmentID, identity);
    log.info(
      `Successfully enrolled admin user ${enrollmentID} and imported it into the wallet. Current state:`,
      await wallet.list(),
    );
  }
}

/**
 * Enroll a user on fabric and store it's credential in local filesystem wallet.
 * Must be called after `enrollAdmin()`
 *
 * @param connectionProfile - Fabric connection profile JSON.
 * @param walletPath - Local filesystem wallet path.
 * @param userName - regular username to enroll.
 * @param adminUserName - admin username (must be already enrolled)
 */
export async function enrollUser(
  connectionProfile: any,
  walletPath: string,
  userName: string,
  adminUserName: string,
) {
  log.info(`Enroll user with userName='${userName}'`);

  // Create a new file system based wallet for managing identities.
  const wallet = new FileSystemWallet(walletPath);

  // Check to see if we've already enrolled the user.
  const userExists = await wallet.exists(userName);
  if (userExists) {
    console.log(
      "An identity for the user userName already exists in the wallet",
    );
    return;
  }

  // Check to see if we've already enrolled the admin user.
  const adminExists = await wallet.exists(adminUserName);
  if (!adminExists) {
    throw new Error(
      "An identity for the admin user adminUserName does not exist in the wallet",
    );
  }

  // Create a new gateway for connecting to our peer node.
  const gateway = new Gateway();
  await gateway.connect(connectionProfile, {
    wallet,
    identity: adminUserName,
    discovery: { enabled: true, asLocalhost: true },
  });

  // Get the CA client object from the gateway for interacting with the CA.
  const ca = gateway.getClient().getCertificateAuthority();
  const adminIdentity = gateway.getCurrentIdentity();

  // Register the user, enroll the user, and import the new identity into the wallet.
  const secret = await ca.register(
    {
      affiliation: "org1.department1",
      enrollmentID: userName,
      role: "client",
    },
    adminIdentity,
  );
  const enrollment = await ca.enroll({
    enrollmentID: userName,
    enrollmentSecret: secret,
  });
  const userIdentity = X509WalletMixin.createIdentity(
    connectionProfile.organizations.Org1.mspid,
    enrollment.certificate,
    enrollment.key.toBytes(),
  );
  await wallet.import(userName, userIdentity);
  log.info(
    `Successfully enrolled user ${userName} and imported it into the wallet. Current state:`,
    await wallet.list(),
  );
}

/**
 * Get cryptographic data for specified user from local filesystem wallet.
 * Can be used to sign transactions as specified user.
 *
 * @param name - Username enrolled in wallet.
 * @param walletPath - Local filesystem wallet path.
 * @returns A tuple [certificatePem, privateKeyPem]
 */
export async function getUserCryptoFromWallet(
  name: string,
  walletPath: string,
): Promise<[string, string]> {
  const wallet = new FileSystemWallet(walletPath);

  const submitterExists = await wallet.exists(name);
  if (!submitterExists) {
    throw new Error(`User ${name} does not exist in wallet ${walletPath}`);
  }

  const submitterIdentity = await wallet.export(name);
  const certPem = (submitterIdentity as any).certificate;
  const privateKeyPem = (submitterIdentity as any).privateKey;
  return [certPem, privateKeyPem];
}
