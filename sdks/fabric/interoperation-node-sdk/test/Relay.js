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

const { expect } = chai;
chai.use(sinonChai);
const { Relay } = RelayHelper;
const expectThrowsAsync = async (method, errorMessage) => {
    let error = null;
    try {
        await method();
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
});
