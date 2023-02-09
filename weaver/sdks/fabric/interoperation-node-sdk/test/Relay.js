/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-unused-expressions */
/* eslint-disable no-new */
/* eslint-disable no-underscore-dangle */

const rewire = require("rewire");

const RelayHelper = rewire("../src/Relay");
const chai = require("chai");

const sinon = require("sinon");
const sinonChai = require("sinon-chai");

import statePb from "@hyperledger-labs/weaver-protos-js/common/state_pb";
import ackPb from "@hyperledger-labs/weaver-protos-js/common/ack_pb";
import networksGrpcPb from "@hyperledger-labs/weaver-protos-js/networks/networks_grpc_pb";
import networksPb from "@hyperledger-labs/weaver-protos-js/networks/networks_pb";

const { expect } = chai;
chai.use(sinonChai);
const { Relay } = RelayHelper;
var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

const expectThrowsAsync = async (method, args, errorMessage) => {
    let error = null;
    try {
        await method(...args);
    } catch (err) {
        error = err;
    }
    expect(error).to.be.an("Error");
    if (errorMessage) {
        expect(error.message).to.equal(errorMessage);
    }
};

// TODO: Add more testing for relay, need a mock gRPC endpoint
describe("Relay", () => {
    let revert;

    const sandbox = sinon.createSandbox();
    let FakeLogger;
    let FakeUtils;

    beforeEach(() => {
        revert = [];
        FakeLogger = {
            debug: () => {},
            error: () => {},
            warn: () => {},
        };
        sandbox.stub(FakeLogger, "debug");
        sandbox.stub(FakeLogger, "error");
        sandbox.stub(FakeLogger, "warn");

        FakeUtils = {
            getConfigSetting: () => {},
            checkIntegerConfig: () => {},
            pemToDER: () => {},
        };
        sandbox.stub(FakeUtils);
    });

    afterEach(() => {
        if (revert.length) {
            revert.forEach(Function.prototype.call, Function.prototype.call);
        }
        sandbox.restore();
    });

    describe("#constructor", () => {
        it("should not permit creation without an url", () => {
            (() => {
                new Relay();
            }).should.throw(/Invalid Arguments/);
        });

        it("should create a valid instance without any opts", () => {
            (() => {
                new Relay("http://someurl");
            }).should.not.throw();
        });
    });

    describe("#getEndpoint", () => {
        let relay;

        beforeEach(() => {
            relay = new Relay("http://someurl");
        });

        it("should set the _endPoint property", () => {
            const expectedUrl = "somenewurl";
            relay._endPoint = expectedUrl;
            relay.getEndpoint().should.equal(expectedUrl);
        });
    });

    describe("#performRemoteRequest", () => {
        let relay;

        it("catch invalid url while doing DNS lookup", async () => {
            relay = new Relay("https://someurl:9080");
            await expectThrowsAsync(() =>
                relay.ProcessRequest("address", "policy", "requestingNetwork", "cert", "sig", "nonce"),
            );
        });
    });
    
    describe("#successful relay api calls", () => {
        const localRelayEndpoint = "localhost:19080"
        const relay = new Relay(localRelayEndpoint);
        // Sample Request Id
        const requestId = "ABC-123"
        // Prepare Sample View
        const meta = new statePb.Meta();
        meta.setProtocol(statePb.Meta.Protocol.FABRIC);
        meta.setTimestamp(new Date().toISOString());
        meta.setProofType('Notarization');
        meta.setSerializationFormat('STRING');
        const view = new statePb.View();
        view.setMeta(meta);
        view.setData(Buffer.from('1'));
        
        const ack = {
            status: ackPb.Ack.STATUS.OK,
            requestId: requestId,
            message: ''
        }

        const relayResponse = {
            requestId: '',
            status: statePb.RequestState.STATUS.COMPLETED,
            view: view.toObject()
        }
        
        let relayServer;
        before(() => {
            relayServer = new grpc.Server();
            var packageDefinition = protoLoader.loadSync(
                'networks/networks.proto',
                {
                 includeDirs: [__dirname + '/../../../../common/protos']
                });
            var networksProto = grpc.loadPackageDefinition(packageDefinition);
            relayServer.addService(networksProto.networks.networks.Network.service, {
                getState: (call, callback) => {
                    relayResponse.requestId = call.request.requestId;
                    callback(null, relayResponse);
                },
                requestState: (_, callback) => {
                    callback(null, ack);
                }
            });
            relayServer.bindAsync(localRelayEndpoint, grpc.ServerCredentials.createInsecure(), () => {
                relayServer.start();
            });
        });
        after(() => {
            relayServer.forceShutdown()
        });
        it("successful send request", async () => {
            const reqId = await relay.SendRequest("", "", "", "", "", "", "", "");
            expect(reqId).to.equal(requestId);
        });
            
        it("successful get request", async () => {
            const res = await relay.GetRequest(requestId, false);
            expect(res.getRequestId()).to.equal(requestId);
            expect(res.getStatus()).to.equal(relayResponse.status);
            expect(res.hasError()).to.equal(false);
            expect(res.hasView()).to.equal(true);
            expect(res.getView().getData_asB64()).to.equal(view.getData_asB64());
            expect(JSON.stringify(res.getView().getMeta().toObject())).to.equal(JSON.stringify(view.getMeta().toObject()));
        });
        
        it("successful process request", async () => {
            const res = await relay.ProcessRequest("", "", "", "", "", "", "", "");
            expect(res.getRequestId()).to.equal(requestId);
            expect(res.getStatus()).to.equal(relayResponse.status);
            expect(res.hasError()).to.equal(false);
            expect(res.hasView()).to.equal(true);
            expect(res.getView().getData_asB64()).to.equal(view.getData_asB64());
            expect(JSON.stringify(res.getView().getMeta().toObject())).to.equal(JSON.stringify(view.getMeta().toObject()));
        });
    });
    describe("#fail relay api calls 1", () => {
        const localRelayEndpoint = "localhost:19081"
        const relay = new Relay(localRelayEndpoint);
        
        let relayServer;
        before(() => {
            relayServer = new grpc.Server();
            var packageDefinition = protoLoader.loadSync(
                'networks/networks.proto',
                {
                 includeDirs: [__dirname + '/../../../../common/protos']
                });
            var networksProto = grpc.loadPackageDefinition(packageDefinition);
            relayServer.addService(networksProto.networks.networks.Network.service, {
                getState: (call, callback) => {
                    callback(new Error("mock error"), null);
                },
                requestState: (_, callback) => {
                    callback(new Error("mock error"), null);
                }
            });
            relayServer.bindAsync(localRelayEndpoint, grpc.ServerCredentials.createInsecure(), () => {
                relayServer.start();
            });
        });
        after(() => {
            relayServer.forceShutdown()
        });
        it("fail send request", async () => {
            const expectedErrMsg = 'Error: Error with Network Client: Error: Request state error: Error: 2 UNKNOWN: mock error';
            try {
                const reqId = await relay.SendRequest("", "", "", "", "", "", "", "");
                throw new Error('IllegalState');
            } catch (error) {
                expect(error.toString()).to.equal(expectedErrMsg)
            }
        });
        
        it("fail get request", async () => {
            const expectedErrMsg = 'Error: Error: Error: 2 UNKNOWN: mock error';
            try {
                const reqId = await relay.GetRequest('', false);
                throw new Error('IllegalState');
            } catch (error) {
                expect(error.toString()).to.equal(expectedErrMsg)
            }
        });
            
    });
    describe("#fail relay api calls 2", () => {
        const localRelayEndpoint = "localhost:19082"
        const relay = new Relay(localRelayEndpoint, 2000);
        const requestId = "ABC-123"

        const ack = {
            status: ackPb.Ack.STATUS.ERROR,
            requestId: requestId,
            message: 'mock error'
        }

        const relayResponse = {
            requestId: '',
            status: statePb.RequestState.STATUS.ERROR,
            error: 'mock error'
        }
        
        let relayServer;
        before(() => {
            relayServer = new grpc.Server();
            var packageDefinition = protoLoader.loadSync(
                'networks/networks.proto',
                {
                 includeDirs: [__dirname + '/../../../../common/protos']
                });
            var networksProto = grpc.loadPackageDefinition(packageDefinition);
            relayServer.addService(networksProto.networks.networks.Network.service, {
                getState: (call, callback) => {
                    relayResponse.requestId = call.request.requestId;
                    callback(null, relayResponse);
                },
                requestState: (_, callback) => {
                    callback(null, ack);
                }
            });
            relayServer.bindAsync(localRelayEndpoint, grpc.ServerCredentials.createInsecure(), () => {
                relayServer.start();
            });
        });
        after(() => {
            relayServer.forceShutdown()
        });
        it("fail send request", async () => {
            const expectedErrMsg = 'Error: Error with Network Client: Error: Request state received negative Ack error: ' + ack.message;
            try {
                const reqId = await relay.SendRequest("", "", "", "", "", "", "", "");
                throw new Error('IllegalState');
            } catch (error) {
                expect(error.toString()).to.equal(expectedErrMsg)
            }
        });
        
        it("fail process request", async () => {
            // SendRequest error
            const expectedErrMsg = 'Error: Error: Request state error: Error: Error with Network Client: Error: Request state received negative Ack error: ' + ack.message;
            try {
                const res = await relay.ProcessRequest("", "", "", "", "", "", "", "");
                throw new Error('IllegalState');
            } catch (error) {
                expect(error.toString()).to.equal(expectedErrMsg)
            }
            
            // GetState error
            ack.status = ackPb.Ack.STATUS.OK;
            ack.message = '';
            const expectedErrMsg2 = 'Error: Error: Error from view payload : ' + relayResponse.error;
            try {
                const res = await relay.ProcessRequest("", "", "", "", "", "", "", "");
                throw new Error('IllegalState');
            } catch (error) {
                expect(error.toString()).to.equal(expectedErrMsg2)
            }
        });
            
        it("fail pending state in process request", async () => {
            // Pending till timeout
            relayResponse.status = statePb.RequestState.STATUS.PENDING;
            relayResponse.error = '';
            const expectedErrMsg3 = 'Error: Error: State error: Error: Timeout: State is still pending.';
            try {
                const res = await relay.ProcessRequest("", "", "", "", "", "", "", "");
                throw new Error('IllegalState');
            } catch (error) {
                expect(error.toString()).to.equal(expectedErrMsg3)
            }
        });
            
    });
});
