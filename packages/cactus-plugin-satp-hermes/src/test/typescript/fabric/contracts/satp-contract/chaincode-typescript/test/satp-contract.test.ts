/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { ChaincodeStub, ClientIdentity } from "fabric-shim";
import { SATPContract } from "./../src/satp-contract";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { expect } from "chai";

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe("SATPContract", () => {
  let contract: SATPContract;
  let sandbox;
  let ctx;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    contract = new SATPContract();
    ctx = sinon.createStubInstance(ChaincodeStub);
    ctx.stub = sinon.createStubInstance(ChaincodeStub);
    ctx.clientIdentity = sinon.createStubInstance(ClientIdentity);

    ctx.clientIdentity.getMSPID.returns("Org1MSP");
    ctx.stub.getState.withArgs("owner").resolves("Org1MSP");
    ctx.stub.getState.withArgs("bridge").resolves("bridge");

    await contract.InitToken(ctx, "Org1MSP");
    ctx.stub.getState.withArgs("name").resolves("SATPContract");
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("#mint", () => {
    it("should add token to a new account and a new total supply", async () => {
      ctx.clientIdentity.getID.returns("Org1MSP");
      ctx.stub.createCompositeKey.returns("balance_Org1MSP");
      ctx.stub.getState.withArgs("balance_Org1MSP").resolves(null);
      ctx.stub.getState.withArgs("totalSupply").resolves(null);

      const response = await contract.mint(ctx, 1000);

      sinon.assert.calledWith(
        ctx.stub.putState,
        "balance_Org1MSP",
        Buffer.from("1000"),
      );
      sinon.assert.calledWith(
        ctx.stub.putState,
        "totalSupply",
        Buffer.from("1000"),
      );
      expect(response).to.equals(true);
    });
  });

  describe("#burn", () => {
    it("should work", async () => {
      ctx.clientIdentity.getID.returns("Org1MSP");
      ctx.stub.createCompositeKey.returns("balance_Org1MSP");
      ctx.stub.getState
        .withArgs("balance_Org1MSP")
        .resolves(Buffer.from("1000"));
      ctx.stub.getState.withArgs("totalSupply").resolves(Buffer.from("2000"));

      const response = await contract.burn(ctx, 1000);
      sinon.assert.calledWith(
        ctx.stub.putState,
        "balance_Org1MSP",
        Buffer.from("0"),
      );
      sinon.assert.calledWith(
        ctx.stub.putState,
        "totalSupply",
        Buffer.from("1000"),
      );
      expect(response).to.equals(true);
    });
  });

  describe("#assign", () => {
    it("should fail when the sender and the recipient are the same", async () => {
      ctx.clientIdentity.getMSPID.returns("bridge");
      await expect(
        contract.assign(ctx, "bridge", "bridge", 1000),
      ).to.be.rejectedWith(
        Error,
        "cannot transfer to and from same client account",
      );
    });

    it("should fail when the message sender does not have permition", async () => {
      ctx.clientIdentity.getMSPID.returns("attacker");
      await expect(
        contract.assign(ctx, "bridge", "attacker", 1000),
      ).to.be.rejectedWith(
        Error,
        "client is not authorized to perform the operation. attacker",
      );
    });

    it("should fail when the sender does not have enough token", async () => {
      ctx.clientIdentity.getMSPID.returns("bridge");
      ctx.stub.createCompositeKey
        .withArgs("balance", ["bridge"])
        .returns("balance_bridge");
      ctx.stub.getState.withArgs("balance_bridge").resolves(Buffer.from("500"));

      await expect(
        contract.assign(ctx, "bridge", "Alice", 1000),
      ).to.be.rejectedWith(
        Error,
        "client account bridge has insufficient funds.",
      );
    });

    it("should transfer to a new account when the sender has enough token", async () => {
      ctx.clientIdentity.getMSPID.returns("bridge");
      ctx.stub.createCompositeKey
        .withArgs("balance", ["bridge"])
        .returns("balance_bridge");
      ctx.stub.getState
        .withArgs("balance_bridge")
        .resolves(Buffer.from("1000"));

      ctx.stub.createCompositeKey
        .withArgs("balance", ["Bob"])
        .returns("balance_Bob");
      ctx.stub.getState.withArgs("balance_Bob").resolves(null);

      const response = await contract.assign(ctx, "bridge", "Bob", 1000);
      sinon.assert.calledWith(
        ctx.stub.putState,
        "balance_bridge",
        Buffer.from("0"),
      );
      sinon.assert.calledWith(
        ctx.stub.putState,
        "balance_Bob",
        Buffer.from("1000"),
      );
      expect(response).to.equals(true);
    });

    it("should transfer to the existing account when the sender has enough token", async () => {
      ctx.clientIdentity.getMSPID.returns("bridge");
      ctx.stub.createCompositeKey
        .withArgs("balance", ["bridge"])
        .returns("balance_bridge");
      ctx.stub.getState
        .withArgs("balance_bridge")
        .resolves(Buffer.from("1000"));

      ctx.stub.createCompositeKey
        .withArgs("balance", ["Bob"])
        .returns("balance_Bob");
      ctx.stub.getState.withArgs("balance_Bob").resolves(Buffer.from("2000"));

      const response = await contract.assign(ctx, "bridge", "Bob", 1000);
      sinon.assert.calledWith(
        ctx.stub.putState,
        "balance_bridge",
        Buffer.from("0"),
      );
      sinon.assert.calledWith(
        ctx.stub.putState,
        "balance_Bob",
        Buffer.from("3000"),
      );
      expect(response).to.equals(true);
    });
  });
  describe("#transfer", () => {
    it("should fail when the spender is not allowed to spend the token", async () => {
      ctx.clientIdentity.getMSPID.returns("bridge");
      ctx.clientIdentity.getID.returns("bridge");

      ctx.stub.createCompositeKey
        .withArgs("allowance", ["owner", "bridge"])
        .returns("allowance_owner_bridge");
      ctx.stub.getState
        .withArgs("allowance_owner_bridge")
        .resolves(Buffer.from("0"));

      await expect(
        contract.transfer(ctx, "owner", "bridge", 1000),
      ).to.be.rejectedWith(
        Error,
        "The spender does not have enough allowance to spend.",
      );
    });

    it("should transfer when the spender is allowed to spend the token", async () => {
      ctx.clientIdentity.getMSPID.returns("bridge");
      ctx.clientIdentity.getID.returns("bridge");

      ctx.stub.createCompositeKey
        .withArgs("allowance", ["owner", "bridge"])
        .returns("allowance_owner_bridge");
      ctx.stub.getState
        .withArgs("allowance_owner_bridge")
        .resolves(Buffer.from("3000"));

      sinon.stub(contract, "_transfer").resolves(true);

      const response = await contract.transfer(ctx, "owner", "bridge", 1000);
      sinon.assert.calledWith(
        ctx.stub.putState,
        "allowance_owner_bridge",
        Buffer.from("2000"),
      );
      const event = { from: "owner", to: "bridge", value: 1000 };
      sinon.assert.calledWith(
        ctx.stub.setEvent,
        "Transfer",
        Buffer.from(JSON.stringify(event)),
      );
      expect(response).to.equals(true);
    });
  });
});
