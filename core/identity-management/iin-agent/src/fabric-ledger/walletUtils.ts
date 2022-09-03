/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import * as path from 'path';
import * as fs from 'fs';

const getWallet = async (walletPath: string) => {
    return await Wallets.newFileSystemWallet(walletPath);
};

const walletSetup = async (walletPath: string, conn_profile_path: string, config_file_path: string): Promise<any> => {
    if (!fs.existsSync(conn_profile_path)) {
        throw new Error('Connection profile does not exist at path: ' + conn_profile_path);
    }
    const ccp = JSON.parse(fs.readFileSync(conn_profile_path, 'utf8').toString());
    if (!fs.existsSync(config_file_path)) {
        throw new Error('Config does not exist at path: ' + config_file_path);
    }
    const config = JSON.parse(fs.readFileSync(config_file_path, 'utf8').toString());
    // Create a new CA client for interacting with the CA.
    const org = ccp.client["organization"];
    console.log('Org', org);
    const caName =  ccp.organizations[org]["certificateAuthorities"][0];
    console.log('CA Name', caName);
    const caURL = config.caUrl ? config.caUrl : ccp.certificateAuthorities[caName].url;
    console.log('CA URL', caURL);
    const ca = new FabricCAServices(caURL);
    const ident = ca.newIdentityService();

    const wallet = await getWallet(walletPath);
    const adminName = config.admin.name;
    const adminSecret = config.admin.secret;
    // build a user object for authenticating with the CA        // Check to see if we've already enrolled the admin user.
    let adminIdentity = await wallet.get(adminName);

    if (adminIdentity) {
        console.log('An identity for the admin user "admin" already exists in the wallet');
    } else {
        // Enroll the admin user, and import the new identity into the wallet.
        console.log('Enrolling Admin...', adminName, adminSecret);
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
            type: 'X.509',
        };
        await wallet.put(adminName, x509Identity);
        adminIdentity = await wallet.get(adminName);
    }
    if (adminIdentity) {
        console.log(`Creating ${config.agent.name} Identity`);
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, adminName);
        const identity = await wallet.get(config.agent.name);
        if (!identity) {
            const secret = await ca.register(
                {
                    affiliation: config.agent.affiliation,
                    enrollmentID: config.agent.name,
                    role: config.agent.role,
                    attrs: config.agent.attrs,
                },
                adminUser,
            );
            const enrollment = await ca.enroll({
                enrollmentID: config.agent.name,
                enrollmentSecret: secret,
            });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: config.mspId,
                type: 'X.509',
            };
            await wallet.put(config.agent.name, x509Identity);
            console.log(`${config.agent.name} Identity Created`);
        } else {
            console.log(`${config.agent.name} Identity Already exists`);
        }

        return wallet;
    } else {
        console.error('Admin was not registered');
        throw new Error('Admin was not registered');
    }
};

export { getWallet, walletSetup };
