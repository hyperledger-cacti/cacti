/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-unused-expressions */

const fs = require("fs");
const keyutil = require("jsrsasign").KEYUTIL;
const sinon = require("sinon");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
const { expect } = chai;
chai.should();

const { Wallets } = require("fabric-network");
const { ContractImpl } = require("fabric-network/lib/contract");
const { NetworkImpl } = require("fabric-network/lib/network");
const membershipPb = require('@hyperledger-labs/weaver-protos-js/common/membership_pb');


describe("Membership", () => {
    const mspId = "mspId";
    const foreignNetworkId = "foreignNetworkId";
    const userName = "user_name";

    let wallet;
    // Initialize wallet with a single user identity
    async function initializeWallet() {
        const privKeyFile = `${__dirname}/data/privKey.pem`;
        const signCertFile = `${__dirname}/data/signCert.pem`;
        const privateKeyStr = fs.readFileSync(privKeyFile).toString();
        const signCert = fs.readFileSync(signCertFile).toString();
        lockerECert = signCert;
        wallet = await Wallets.newInMemoryWallet();
        const userIdentity = {
            credentials: { certificate: signCert, privateKey: privateKeyStr },
            mspId,
            type: "X.509",
        };
        await wallet.put(userName, userIdentity);
        return userIdentity;
    }
    
    describe("serialize membership", () => {

        it("test 1", async () => {
            const membership = new membershipPb.Membership()
            membership.setSecuritydomain('2345')
            
            const member = new membershipPb.Member()
            member.setValue('')
            member.setType('certificate')
            member.setChainList(['chain1-cert1', 'chain1-cert2', 'chain1-cert3'])
            membership.getMembersMap().set('member1', member)
            
            const member2 = new membershipPb.Member()
            member2.setValue('')
            member2.setType('certificate')
            member2.setChainList(['chain2-cert1', 'chain2-cert2', 'chain2-cert3'])
            membership.getMembersMap().set('member2', member2)
            
            const ms64 = Buffer.from(membership.serializeBinary()).toString('base64')
            console.log(ms64)
            expect(ms64).to.equal('CgQyMzQ1EkIKB21lbWJlcjESNxILY2VydGlmaWNhdGUaDGNoYWluMS1jZXJ0MRoMY2hhaW4xLWNlcnQyGgxjaGFpbjEtY2VydDMSQgoHbWVtYmVyMhI3EgtjZXJ0aWZpY2F0ZRoMY2hhaW4yLWNlcnQxGgxjaGFpbjItY2VydDIaDGNoYWluMi1jZXJ0Mw==');
        });
    });

});
