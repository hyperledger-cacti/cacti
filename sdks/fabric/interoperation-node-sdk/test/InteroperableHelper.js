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
const ecies = require("../src/eciesCrypto");
const {
    decryptRemoteProposalResponse,
    decryptRemoteChaincodeOutput,
    verifyDecryptedRemoteProposalResponse,
    verifyRemoteProposalResponse,
    getKeyAndCertForRemoteRequestbyUserName,
    getPolicyCriteriaForAddress,
    getSignatoryNodeFromCertificate,
    invokeHandler,
} = require("../src/InteroperableHelper");
const { deserializeRemoteProposalResponseBase64, serializeRemoteProposalResponse } = require("../src/decoders");

describe("InteroperableHelper", () => {
    const mspId = "mspId";
    const foreignNetworkId = "foreignNetworkId";
    const userName = "user_name";

    let wallet;
    let interopcc;
    // Initialize wallet with a single user identity
    async function initializeWallet() {
        const privKeyFile = `${__dirname}/data/privKey.pem`;
        const signCertFile = `${__dirname}/data/signCert.pem`;
        const privateKeyStr = fs.readFileSync(privKeyFile).toString();
        const signCert = fs.readFileSync(signCertFile).toString();
        wallet = await Wallets.newInMemoryWallet();
        const userIdentity = {
            credentials: { certificate: signCert, privateKey: privateKeyStr },
            mspId,
            type: "X.509",
        };
        await wallet.put(userName, userIdentity);
        return userIdentity;
    }
    beforeEach(async () => {
        await initializeWallet();
        const network = sinon.createStubInstance(NetworkImpl);
        interopcc = new ContractImpl(network, "interopcc", "InteroperableHelper");
    });

    afterEach(() => {
        sinon.restore();
    });

    describe("deserialize/serialize proposal structures", () => {
        const samplePropJSON = JSON.parse(fs.readFileSync(`${__dirname}/data/prop.json`).toString());
        let deserializedPR;

        it("base64-encoded byte array deserialized into proposal response", () => {
            expect(() => {
                const dpropResp = deserializeRemoteProposalResponseBase64(samplePropJSON.resp);
                expect(dpropResp)
                    .to.be.an("object")
                    .to.include.all.keys("version", "response", "payload", "endorsement");
                expect(dpropResp.response).to.be.an("object").to.include.all.keys("status", "payload");
                expect(dpropResp.endorsement).to.be.an("object").that.has.all.keys("endorser", "signature");
                expect(dpropResp.response.status).to.equal(samplePropJSON.status);
                expect(dpropResp.response.payload).to.be.a("Uint8Array");
                expect(dpropResp.response.payload.toString("utf8")).to.equal(samplePropJSON.ccmessage);
                expect(dpropResp.endorsement.endorser).to.be.a("Uint8Array");
                expect(dpropResp.endorsement.signature).to.be.a("Uint8Array");
                deserializedPR = dpropResp;
            }).to.not.throw();
        });

        it("proposal response protobuf serialized into byte string", () => {
            expect(() => {
                const propResp = serializeRemoteProposalResponse(deserializedPR);
                expect(propResp).to.be.a("Uint8Array");
                expect(propResp.toString("base64")).to.equal(samplePropJSON.resp);
            }).to.not.throw();
        });
    });

    describe("cryptographic functions", () => {
        it("encrypt and decrypt a message", () => {
            const data = '{ "data": "xyz" }';
            const privKeyFile = `${__dirname}/data/privKey.pem`;
            const privKeyPEM = fs.readFileSync(privKeyFile).toString();
            const privKey = keyutil.getKeyFromPlainPrivatePKCS8PEM(privKeyPEM);
            const signCertFile = `${__dirname}/data/signCert.pem`;
            const signCertPEM = fs.readFileSync(signCertFile).toString();
            const pubKey = keyutil.getKey(signCertPEM);
            const cryptoOptions = { hashAlgorithm: "SHA2" };
            expect(() => {
                const encryptedData = ecies.eciesEncryptMessage(pubKey, Buffer.from(data), cryptoOptions);
                expect(encryptedData).to.be.a("Uint8Array");
                expect(() => {
                    const decryptedData = ecies.eciesDecryptMessage(privKey, encryptedData, cryptoOptions);
                    expect(decryptedData).to.be.a("Uint8Array");
                    expect(decryptedData.toString()).to.equal(data);
                }).to.not.throw();
            }).to.not.throw();
        });
    });

    describe("decrypt remote proposal response", () => {
        it("decrypt proposal response using private key", () => {
            const samplePropJSON = JSON.parse(fs.readFileSync(`${__dirname}/data/prop.json`).toString());
            const privKeyFile = `${__dirname}/data/privKey.pem`;
            const privKeyPEM = fs.readFileSync(privKeyFile).toString();
            expect(() => {
                const decResp = decryptRemoteProposalResponse(samplePropJSON.eresp, privKeyPEM);
                expect(decResp).to.be.an("object").to.include.all.keys("version", "response", "payload", "endorsement");
                expect(decResp.response).to.be.an("object").to.include.all.keys("status", "payload");
                expect(decResp.endorsement).to.be.an("object").that.has.all.keys("endorser", "signature");
                expect(decResp.response.status).to.equal(samplePropJSON.status);
                expect(decResp.response.payload).to.be.a("Uint8Array");
                expect(decResp.response.payload.toString("utf8")).to.equal(samplePropJSON.ccmessage);
                expect(decResp.payload).to.be.a("Uint8Array");
                expect(decResp.endorsement.endorser).to.be.a("Uint8Array");
                expect(decResp.endorsement.signature).to.be.a("Uint8Array");
            }).to.not.throw();
        });
    });

    describe("decrypt remote chaincode output", () => {
        it("decrypt chaincode output using private key", () => {
            const samplePropJSON = JSON.parse(fs.readFileSync(`${__dirname}/data/prop.json`).toString());
            const privKeyFile = `${__dirname}/data/privKey.pem`;
            const privKeyPEM = fs.readFileSync(privKeyFile).toString();
            expect(() => {
                const decResp = decryptRemoteChaincodeOutput(samplePropJSON.eccresp, privKeyPEM);
                expect(decResp).to.be.an("object").to.include.all.keys("version", "response", "payload", "endorsement");
                expect(decResp.response).to.be.an("object").to.include.all.keys("status", "payload");
                expect(decResp.response.payload).to.be.a("Uint8Array");
                expect(decResp.response.payload.toString("utf8")).to.equal(samplePropJSON.ccmessage);
            }).to.not.throw();
        });
    });

    describe("verify remote proposal response", () => {
        beforeEach(() => {
            const ccResult = fs.readFileSync(`${__dirname}/data/exporter_org_msp_config.json`);
            sinon.stub(interopcc, "evaluateTransaction").resolves(ccResult);
        });

        const samplePropJSON = JSON.parse(fs.readFileSync(`${__dirname}/data/prop.json`).toString());
        const privKeyFile = `${__dirname}/data/privKey.pem`;
        const privKeyPEM = fs.readFileSync(privKeyFile).toString();

        it("validate plaintext proposal response and endorsement", async () => {
            const dpropResp = deserializeRemoteProposalResponseBase64(samplePropJSON.resp);
            const verificationStatus = await verifyDecryptedRemoteProposalResponse(dpropResp, foreignNetworkId);
            expect(verificationStatus).to.be.a("boolean");
            expect(verificationStatus).to.be.true;
        });

        it("validate plaintext proposal response and endorsement with wrapper", async () => {
            const verificationStatus = await verifyRemoteProposalResponse(
                samplePropJSON.resp,
                false,
                null,
                foreignNetworkId,
            );
            expect(verificationStatus).to.be.an("object").that.has.all.keys("proposalResponse", "valid");
            expect(verificationStatus.proposalResponse).to.be.a("string");
            expect(verificationStatus.valid).to.be.a("boolean");
            expect(verificationStatus.valid).to.be.true;
        });

        it("validate decrypted proposal response and endorsement", async () => {
            const decResp = decryptRemoteProposalResponse(samplePropJSON.eresp, privKeyPEM);
            const verificationStatus = await verifyDecryptedRemoteProposalResponse(decResp, foreignNetworkId);
            expect(verificationStatus).to.be.a("boolean");
            expect(verificationStatus).to.be.true;
        });

        it("validate encrypted proposal response and endorsement with wrapper", async () => {
            const verificationStatus = await verifyRemoteProposalResponse(
                samplePropJSON.eresp,
                true,
                privKeyPEM,
                foreignNetworkId,
            );
            expect(verificationStatus).to.be.an("object").that.has.all.keys("proposalResponse", "valid");
            expect(verificationStatus.proposalResponse).to.be.a("string");
            expect(verificationStatus.valid).to.be.a("boolean");
            expect(verificationStatus.valid).to.be.true;
        });
    });

    describe("get client credentials for remote transaction", () => {
        const privKeyFile = `${__dirname}/data/privKey.pem`;
        const signCertFile = `${__dirname}/data/signCert.pem`;
        const privateKeyStr = fs.readFileSync(privKeyFile).toString();
        const privKey = keyutil.getKeyFromPlainPrivatePKCS8PEM(privateKeyStr);
        const signCert = fs.readFileSync(signCertFile).toString();

        it("obtain key and certificate from wallet identity", async () => {
            const keyCert = await getKeyAndCertForRemoteRequestbyUserName(wallet, userName);
            const keyHex = keyutil.getKeyFromPlainPrivatePKCS8PEM(keyCert.key.toBytes()).prvKeyHex;
            expect(keyHex).to.equal(privKey.prvKeyHex);
            expect(keyCert.cert).to.equal(signCert);
        });
    });

    describe("verify get policy criteria lookup", () => {
        beforeEach(() => {
            const vpJSON = {
                securityDomain: "network1",
                identifiers: [
                    { pattern: "mychannel:simplestate:Read*", policy: { type: "Signature", criteria: ["Org1MSP"] } },
                    { pattern: "notmatching", policy: { type: "Signature", criteria: ["NotMatching"] } },
                ],
                viewPatterns: [],
            };
            const vpResult = JSON.stringify(vpJSON);
            const interopccStub = sinon.stub(interopcc, "evaluateTransaction").resolves(vpResult);
            interopccStub.withArgs("GetVerificationPolicyBySecurityDomain", "network1").resolves(vpResult);
        });

        it("validate policy syntax and attributes", async () => {
            const policyJSON = await getPolicyCriteriaForAddress(
                interopcc,
                "localhost:9080/network1/mychannel:simplestate:Read:Arcturus",
            );
            expect(policyJSON).to.be.an("array");
            expect(policyJSON.length).to.equal(1);
            expect(policyJSON[0]).to.be.equal("Org1MSP");
        });
    });

    describe("extract node id from certificate", () => {
        const sampleCordaNodeId = "BuyerBankNode";
        const sampleCertBase64 =
            "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUI0VENDQVgyZ0F3SUJBZ0lJSmJTMHJaRFRkNkF3RkFZSUtvWkl6ajBFQXdJR0NDcUdTTTQ5QXdFSE1EWXhDekFKQmdOVkJBWVRBa2RDTVE4d0RRWURWUVFIREFaTWIyNWtiMjR4RmpBVUJnTlZCQW9NRFVKMWVXVnlRbUZ1YTA1dlpHVXdIaGNOTWpBd01qSTRNREF3TURBd1doY05NamN3TlRJd01EQXdNREF3V2pBMk1Rc3dDUVlEVlFRR0V3SkhRakVQTUEwR0ExVUVCd3dHVEc5dVpHOXVNUll3RkFZRFZRUUtEQTFDZFhsbGNrSmhibXRPYjJSbE1Db3dCUVlESzJWd0F5RUFzZnRabnpSZ3Q4UEIzQlc4Z3FRa05mRHMyUGJLaC9ULytiOVNQM2VadHZpamdaa3dnWll3SFFZRFZSME9CQllFRlAyTWs1NjdyQ0VSYWpXcEZYVFNMVTJEVlhGNE1BOEdBMVVkRXdFQi93UUZNQU1CQWY4d0N3WURWUjBQQkFRREFnS0VNQ01HQTFVZEpRUWNNQm9HQ0NzR0FRVUZCd01CQmdnckJnRUZCUWNEQWdZRVZSMGxBREFmQmdOVkhTTUVHREFXZ0JTcDRiZFpteFhlblptakJ2enJnMDV0b040MHZEQVJCZ29yQmdFRUFZT0tZZ0VCQkFNQ0FRWXdGQVlJS29aSXpqMEVBd0lHQ0NxR1NNNDlBd0VIQTBnQU1FVUNJRjhIbDhSZ1U5T2VLT2NFaVRyYkZSQ0hUVUppN3MyL2wralIwYmFMUnVGN0FpRUF6SGp1Y1loMGNOWHBiUnE2OG0xcDlMaFJRbTBTSkt4ZUFQV2xtRVphKzZNPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t";

        it("validate remote node name associated with certificate", async () => {
            const nodeId = await getSignatoryNodeFromCertificate(sampleCertBase64);
            expect(nodeId).to.be.a("string");
            expect(nodeId).to.equal(sampleCordaNodeId);
        });
    });
    describe("test invoke handler", () => {
        beforeEach(() => {
            const vpJSON = {
                securityDomain: "network1",
                identifiers: [
                    { pattern: "mychannel:simplestate:Read", policy: { type: "Signature", criteria: ["Org1MSP"] } },
                    { pattern: "notmatching", policy: { type: "Signature", criteria: ["NotMatching"] } },
                ],
                viewPatterns: [],
            };
            const interopccStub = sinon.stub(interopcc, "submitTransaction").resolves(false);
            interopccStub.withArgs("Write", "w", "value").resolves(true);
            interopccStub
                .withArgs(
                    "WriteExternalState",
                    "interop",
                    "mychannel",
                    "Write",
                    JSON.stringify(["w"], "localhost:9080/network1/mychannel:simplestate:Read:Arcturus"),
                )
                .resolves(true);
            const vpResult = JSON.stringify(vpJSON);
            const interopccStub2 = sinon.stub(interopcc, "evaluateTransaction").resolves(vpResult);
            interopccStub2.withArgs("GetVerificationPolicyBySecurityDomain", "network1").resolves(vpResult);
        });
        it("works as a normal invoke", async () => {
            const invokeObject = {
                ccArgs: ["w", "value"],
                channel: "MyChannel",
                ccFunc: "Write",
                contractName: "simplestate",
            };
            const remoteJSON = {};
            const keyCert = await getKeyAndCertForRemoteRequestbyUserName(wallet, userName);
            const invokeHandlerResponse = await invokeHandler(
                interopcc,
                "networkID",
                "org",
                invokeObject,
                remoteJSON,
                keyCert,
            );
            expect(invokeHandlerResponse).to.be.a("boolean");
            expect(invokeHandlerResponse).to.equal(true);
        });
    });
});
