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
const { Transaction } = require("fabric-network/lib/transaction");
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
    interopFlow
} = require("../src/InteroperableHelper");
const { deserializeRemoteProposalResponseBase64, serializeRemoteProposalResponse } = require("../src/decoders");
import { Relay } from "../src/Relay";
import statePb from "@hyperledger-labs/weaver-protos-js/common/state_pb";

describe("InteroperableHelper", () => {
    const mspId = "mspId";
    const foreignNetworkId = "foreignNetworkId";
    const userName = "user_name";
    const localRelayEndpoint = "localhost:9081";
    const viewAddresses = ["localhost:9080/network1/mychannel:simplestate:Read:Arcturus",
        "localhost:9080/network1/mychannel:simplestate:Read:Betelguese:1"];
    const wrongViewAddress = "localhost:9080/network1/mychannel:simplestate:ReadWrong:Arcturus";

    let wallet;
    let interopcc;
    let interopccStub;
    let writeExternalStateTransaction;
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
        writeExternalStateTransaction = sinon.createStubInstance(Transaction)
        interopccStub = sinon.stub(interopcc, "createTransaction").withArgs('WriteExternalState').returns(writeExternalStateTransaction);
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
                    { pattern: "mychannel:simplestate:Read:*", policy: { type: "Signature", criteria: ["Org1MSP"] } },
                    { pattern: "notmatching", policy: { type: "Signature", criteria: ["NotMatching"] } },
                ],
                viewPatterns: [],
            };
            const vpResult = JSON.stringify(vpJSON);
            const interopccStub = sinon.stub(interopcc, "evaluateTransaction").resolves(vpResult);
            interopccStub.withArgs("GetVerificationPolicyBySecurityDomain", "network1").resolves(vpResult);
            interopccStub.withArgs("GetVerificationPolicyBySecurityDomain", "network2").resolves("");
        });

        it("validate policy syntax and attributes", async () => {
            const policyJSON = await getPolicyCriteriaForAddress(
                interopcc,
                viewAddresses[0],
            );
            expect(policyJSON).to.be.an("array");
            expect(policyJSON.length).to.equal(1);
            expect(policyJSON[0]).to.be.equal("Org1MSP");
        });
        it("fail to match verificationPolicy", async () => {
            // no match found
            let policyJSON = await getPolicyCriteriaForAddress(
                interopcc,
                wrongViewAddress,
            );
            expect(policyJSON).to.equal(null);
            
            // no policy found
            try {
                policyJSON = await getPolicyCriteriaForAddress(
                    interopcc,
                    wrongViewAddress,
                );
            } catch(error) {
                expect(error.toString()).to.equal('Error: Error during getPolicyCriteriaForAddress: Error: No verification policy for address ' + wrongViewAddress);
            }
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
                    JSON.stringify(["w"], viewAddresses[0]),
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
    
    describe("test interopFlow", () => {
        const appId = "simplestate";
        const channel = "mychannel";
        const appFn = "Write";
        const appArgs = ["w", "value", "", ""];
        const argsIndices = [2, 3];
            
        const meta = new statePb.Meta();
        meta.setProtocol(statePb.Meta.Protocol.FABRIC);
        meta.setTimestamp(new Date().toISOString());
        meta.setProofType('Notarization');
        meta.setSerializationFormat('STRING');
        
        const view1 = new statePb.View();
        view1.setMeta(meta);
        view1.setData(Buffer.from('1'));
        const relayResponse1 = new statePb.RequestState();
        relayResponse1.setRequestId("ABC-123");
        relayResponse1.setStatus(statePb.RequestState.COMPLETED);
        relayResponse1.setView(view1);
        
        const view2 = new statePb.View();
        view2.setMeta(meta);
        view2.setData(Buffer.from('2'));
        const relayResponse2 = new statePb.RequestState();
        relayResponse2.setRequestId("ABC-124");
        relayResponse2.setStatus(statePb.RequestState.COMPLETED);
        relayResponse2.setView(view2);
        
        const views64 = [Buffer.from(view1.serializeBinary()).toString("base64"), 
            Buffer.from(view2.serializeBinary()).toString("base64")]
        
        beforeEach(() => {
            const vpJSON = {
                securityDomain: "network1",
                identifiers: [
                    { pattern: "mychannel:simplestate:Read:*", policy: { type: "Signature", criteria: ["Org1MSP"] } }
                ],
                viewPatterns: [],
            };
            writeExternalStateTransaction.submit.resolves(false);
            writeExternalStateTransaction.submit
                .withArgs(
                    appId,
                    channel,
                    appFn,
                    JSON.stringify(appArgs),
                    JSON.stringify(argsIndices),
                    JSON.stringify(viewAddresses),
                    JSON.stringify(views64),
                    JSON.stringify([[], []])
                ).resolves(true);
            
            const vpResult = JSON.stringify(vpJSON);
            const interopccStub2 = sinon.stub(interopcc, "evaluateTransaction").rejects("interopcc error");
            interopccStub2.withArgs("GetVerificationPolicyBySecurityDomain", "network1").resolves(vpResult);
            interopccStub2.withArgs("VerifyView", views64[0], viewAddresses[0]).resolves(true);
            interopccStub2.withArgs("VerifyView", views64[1], viewAddresses[1]).resolves(true);
            
            //Relay Stub response
            // const relayStub = sinon.stub(relaySDK, "ProcessRequest")
            const relayStub = sinon.stub(Relay.prototype, "ProcessRequest")
            relayStub.onCall(1).resolves(relayResponse2)
            relayStub.onCall(2).rejects(new Error("relay error"))
            relayStub.resolves(relayResponse1)
        });

        
        it("successful data sharing query", async () => {
            const invokeObject = {
                channel: channel,
                ccFunc: appFn,
                ccArgs: appArgs,
                contractName: appId
            };
            const remoteJSON1 = {
                address: viewAddresses[0],
                Sign: true
            }
            const remoteJSON2 = {
                ChaincodeFunc: "Read",
                ChaincodeID: "simplestate",
                ChannelID: "mychannel",
                RemoteEndpoint: "localhost:9080",
                NetworkID: "network1",
                Sign: true,
                ccArgs: ["Betelguese", "1"]
            }
            const keyCert = await getKeyAndCertForRemoteRequestbyUserName(wallet, userName);
            const interopResponse = await interopFlow(
                interopcc,
                "network-id",
                invokeObject,
                "org",
                localRelayEndpoint,
                argsIndices,
                [remoteJSON1, remoteJSON2],
                keyCert
            );
            expect(interopResponse).to.be.an('object').that.has.all.keys('views', 'result');
            expect(interopResponse.views).to.be.an('array');
            expect(interopResponse.views).to.have.lengthOf(viewAddresses.length);
            expect(interopResponse.views[0]).to.equal(view1);
            expect(interopResponse.views[1]).to.equal(view2);
            expect(interopResponse.result).to.be.a('boolean');
            expect(interopResponse.result).to.equal(true);
        });
        
        it("fail data sharing query: relay error", async () => {
            const invokeObject = {
                channel: channel,
                ccFunc: appFn,
                ccArgs: appArgs,
                contractName: appId
            };
            const remoteJSON = {
                address: viewAddresses[0],
                Sign: true
            }
            const keyCert = await getKeyAndCertForRemoteRequestbyUserName(wallet, userName);
            try {
                const interopResponse = await interopFlow(
                    interopcc,
                    "network-id",
                    invokeObject,
                    "org",
                    localRelayEndpoint,
                    [0],
                    [remoteJSON],
                    keyCert
                );
            } catch (error) {
                const expectedErrMsg = 'Error: InteropFlow remote view request error: Error: InteropFlow relay response error: Error: relay error'
                expect(error.toString()).to.equal(expectedErrMsg)
            }
        });
        
        it("fail data sharing query: view verification error", async () => {
            const invokeObject = {
                channel: channel,
                ccFunc: appFn,
                ccArgs: appArgs,
                contractName: appId
            };
            const remoteJSON = {
                address: wrongViewAddress,
                Sign: true
            }
            const keyCert = await getKeyAndCertForRemoteRequestbyUserName(wallet, userName);
            try {
                const interopResponse = await interopFlow(
                    interopcc,
                    "network-id",
                    invokeObject,
                    "org",
                    localRelayEndpoint,
                    [0],
                    [remoteJSON],
                    keyCert
                );
            } catch (error) {
                const expectedErrMsg = 'Error: InteropFlow remote view request error: Error: View verification failed Error: Unable to verify view: interopcc error'
                expect(error.toString()).to.equal(expectedErrMsg)
            }
        });
        
        it("fail data sharing query: write external state error", async () => {
            const invokeObject = {
                channel: channel,
                ccFunc: appFn,
                ccArgs: appArgs,
                contractName: appId
            };
            const remoteJSON = {
                address: viewAddresses[0],
                Sign: true
            }
            const keyCert = await getKeyAndCertForRemoteRequestbyUserName(wallet, userName);
            const interopResponse = await interopFlow(
                interopcc,
                "network-id",
                invokeObject,
                "org",
                localRelayEndpoint,
                [0],
                [remoteJSON],
                keyCert
            );
            expect(interopResponse).to.be.an('object').that.has.all.keys('views', 'result');
            expect(interopResponse.views).to.be.an('array');
            expect(interopResponse.views).to.have.lengthOf(1);
            expect(interopResponse.views[0]).to.equal(view1);
            expect(interopResponse.result).to.be.a('boolean');
            expect(interopResponse.result).to.equal(false);
        });
    });
});
