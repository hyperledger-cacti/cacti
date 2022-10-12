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
const agent_pb = require('@hyperledger-labs/weaver-protos-js/identity/agent_pb');

const utils = require('../out/common/utils.js')

describe("Membership", () => {
    const fabricMemberId = "Org1MSP";
    const cordaMemberId = 'PartyA'
    const securityDomain = "network1";
    const foreignSecurityDomain = "network2";
    const userName = "user1";
    const cert = fs.readFileSync(`${__dirname}/data/anotherSignCert.pem`).toString();
    const cordaCert = fs.readFileSync(`${__dirname}/data/cordaCert.pem`).toString();
    const cert2 = fs.readFileSync(`${__dirname}/data/signCert.pem`).toString();
    const pkey2 = fs.readFileSync(`${__dirname}/data/privKey.pem`).toString();
    const nonce = '123'
    const fabricAttestedMembership = getForeignAttestedMembership(`${__dirname}/data/fabricMembership.json`, fabricMemberId)
    const cordaAttestedMembership = getForeignAttestedMembership(`${__dirname}/data/cordaMembership.json`, cordaMemberId)
    
    function getForeignAttestedMembership(filename, memberId) {
        const membershipJSON = JSON.parse(fs.readFileSync(filename).toString());
        const member = new membershipPb.Member()
        member.setValue(membershipJSON.members[memberId].value)
        member.setType(membershipJSON.members[memberId].type)
        if (membershipJSON.members[memberId].chain) {
            for (const cacert of membershipJSON.members[memberId].chain) {
                member.addChain(cacert)
            }
        }
        const membership = new membershipPb.Membership()
        membership.setSecuritydomain(membershipJSON.securityDomain)
        membership.getMembersMap().set(memberId, member)
        
        const membershipSerialized64 = Buffer.from(membership.serializeBinary()).toString('base64')
        const sign = utils.signMessage(membershipSerialized64+nonce, pkey2)
        const unitIdentity = new agent_pb.SecurityDomainMemberIdentity()
        unitIdentity.setSecurityDomain(membershipJSON.securityDomain)
        unitIdentity.setMemberId(memberId)
        const attestation = new agent_pb.Attestation()
        attestation.setUnitIdentity(unitIdentity)
        attestation.setSignature(sign)
        attestation.setCertificate(cert2)
        attestation.setNonce(nonce)
        attestation.setTimestamp(Date.now())
        
        const attestedMembership = new agent_pb.AttestedMembership()
        attestedMembership.setMembership(membershipSerialized64)
        attestedMembership.setAttestation(attestation)
        
        return attestedMembership
    }

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

    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // 
    // beforeEach(async () => {
    //     await initializeWallet();
    //     const network = sinon.createStubInstance(NetworkImpl);
    //     amc = new ContractImpl(network, "amc", "AssetManager");
    // });
    // 
    // afterEach(() => {
    //     sinon.restore();
    // });
    
    describe("test signature creation and verification", () => {
        const message = "hello123"
        it("test success", async () => {
            const signature = utils.signMessage(message, pkey2)
            const verify = utils.verifySignature(message, cert2, signature)
            expect(verify).to.equal(true)
        });      
        it("test fail 1", async () => {
            const signature = utils.signMessage(message, pkey2)
            const verify = utils.verifySignature('hello12', cert2, signature)
            expect(verify).to.equal(false)
        });       
        it("test fail 2", async () => {
            const signature = utils.signMessage(message, pkey2)
            const verify = utils.verifySignature(message, cert, signature)
            expect(verify).to.equal(false)
        });
    });
    
    describe("verify attestation", () => {
        it("test success", async () => {
            const verify = utils.validateAttestedMembership(fabricAttestedMembership.getMembership(), nonce, fabricAttestedMembership.getAttestation())
            expect(verify).to.equal(true)
        });      
        it("test fail 1", async () => {
            const verify = utils.validateAttestedMembership(fabricAttestedMembership.getMembership(), '1', fabricAttestedMembership.getAttestation())
            expect(verify).to.equal(false)
        });       
        it("test fail 2", async () => {
            const attestation = fabricAttestedMembership.getAttestation()
            attestation.setNonce('1')
            const verify = utils.validateAttestedMembership(fabricAttestedMembership.getMembership(), '1', attestation)
            expect(verify).to.equal(false)
        });
    });
    
    describe("verify Fabric Member In Membership", () => {
        it("test success", async () => {
            const membership = utils.deserializeMembership64(fabricAttestedMembership.getMembership())
            const verify = utils.verifyMemberInMembership(membership, fabricAttestedMembership.getAttestation())
            expect(verify).to.equal(true)
        });
    });
    describe("verify Corda Member In Membership", () => {
        it("test success", async () => {
            const membership = utils.deserializeMembership64(cordaAttestedMembership.getMembership())
            const attestation = cordaAttestedMembership.getAttestation()
            attestation.setCertificate(cordaCert)
            const verify = utils.verifyMemberInMembership(membership, attestation)
            expect(verify).to.equal(true)
        });
    });

});
