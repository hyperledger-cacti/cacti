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
const assetManager = require("../src/AssetManager");

describe("AssetManager", () => {
    const mspId = "mspId";
    const foreignNetworkId = "foreignNetworkId";
    const userName = "user_name";

    const assetType = "bond";
    const assetID = "A001";
    const recipientID = "Bob";

    let wallet;
    let amc;
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
        amc = new ContractImpl(network, "amc", "AssetManager");
    });

    afterEach(() => {
        sinon.restore();
    });

    describe("create HTLC for unique asset", () => {
        beforeEach(() => {
            const amcStub = sinon.stub(amc, "submitTransaction").resolves(true);
            //const amcStub = sinon.stub(amc, "submitTransaction").resolves(false);
            //amcStub.withArgs("LockAsset", assetAgreementStr, lockInfoStr).resolves(true);
        });

        it("submit asset lock invocation", async () => {
            const assetLockInvocation = await assetManager.createHTLC(amc, assetType, assetID, recipientID, "", 0);
            expect(assetLockInvocation).to.be.an('object').that.has.all.keys('preimage', 'result');
            expect(assetLockInvocation.preimage).to.be.a("string");
            expect(assetLockInvocation.preimage.length).to.equal(20);
            expect(assetLockInvocation.result).to.be.a('boolean');
            expect(assetLockInvocation.result).to.equal(true);
        });
    });
});
