/*
 * SPDX-License-Identifier: Apache 2.0
 */

import { Context } from "fabric-contract-api";
import { ChaincodeStub, ClientIdentity } from "fabric-shim";
import { AssetReferenceContract } from ".";

import * as winston from "winston";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

const bridgedOutAmountKey = "amountBridgedOut";

const USER_A_FABRIC_ID =
  "x509::/OU=org1/OU=client/OU=department1/CN=userA::/C=US/ST=North Carolina/L=Durham/O=org1.example.com/CN=ca.org1.example.com";

const USER_A_ETH_ADDRESS =
  "x509::/OU=org1/OU=client/OU=department1/CN=userA::/C=US/ST=North Carolina/L=Durham/O=org1.example.com/CN=ca.org1.example.com";

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

class TestContext extends Context {
  public stub: sinon.SinonStubbedInstance<ChaincodeStub> =
    sinon.createStubInstance(ChaincodeStub);
  public clientIdentity: sinon.SinonStubbedInstance<ClientIdentity> =
    sinon.createStubInstance(ClientIdentity);
  public logging = {
    getLogger: sinon
      .stub()
      .returns(sinon.createStubInstance(winston.createLogger().constructor)),
    setLevel: sinon.stub(),
  };
}

describe("AssetReference", () => {
  let contract: AssetReferenceContract;
  let ctx: TestContext;

  beforeEach(() => {
    contract = new AssetReferenceContract();
    ctx = new TestContext();
    ctx.clientIdentity.getMSPID.resolves("Org2MSP");
    ctx.stub.getState.withArgs(bridgedOutAmountKey).resolves(Buffer.from("50"));
    ctx.stub.getState
      .withArgs("1001")
      .resolves(
        Buffer.from(
          `{"id":"1001","isLocked":false,"numberTokens":10,"recipient":"${USER_A_FABRIC_ID}"}`,
        ),
      );
    ctx.stub.getState
      .withArgs("1002")
      .resolves(
        Buffer.from(
          `{"id":"1002","isLocked":true,"numberTokens":30,"recipient":"${USER_A_FABRIC_ID}"}`,
        ),
      );
  });

  describe("#assetReferenceExists", () => {
    it("should return true for an asset reference", async () => {
      await contract.AssetReferenceExists(ctx, "1001").should.eventually.be
        .true;
    });

    it("should return false for an asset reference that does not exist", async () => {
      await contract.AssetReferenceExists(ctx, "1003").should.eventually.be
        .false;
    });
  });

  describe("#createAssetReference", () => {
    it("should create an asset reference", async () => {
      await contract.CreateAssetReference(ctx, "1003", 100, USER_A_FABRIC_ID);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1003",
        Buffer.from(
          `{"id":"1003","isLocked":false,"numberTokens":100,"recipient":"${USER_A_FABRIC_ID}"}`,
        ),
      );
    });

    it("should throw an error for an asset reference that already exists", async () => {
      await contract
        .CreateAssetReference(ctx, "1001", 100, USER_A_FABRIC_ID)
        .should.be.rejectedWith(
          /The asset reference with ID 1001 already exists/,
        );
    });
  });

  describe("#readAssetReference", () => {
    it("should return an asset reference", async () => {
      await contract
        .ReadAssetReference(ctx, "1001")
        .should.eventually.deep.equal({
          id: "1001",
          isLocked: false,
          numberTokens: 10,
          recipient: USER_A_FABRIC_ID,
        });
    });

    it("should throw an error for an asset reference that does not exist", async () => {
      await contract
        .ReadAssetReference(ctx, "1003")
        .should.be.rejectedWith(/The asset reference 1003 does not exist/);
    });
  });

  describe("#IsAssetReferenceLocked", () => {
    it("should return true for a locked asset reference", async () => {
      const result1 = await contract.IsAssetReferenceLocked(ctx, "1001");
      const result2 = await contract.IsAssetReferenceLocked(ctx, "1002");
      chai.expect(result1).to.be.false;
      chai.expect(result2).to.be.true;

      await contract
        .IsAssetReferenceLocked(ctx, "1003")
        .should.be.rejectedWith(/The asset reference 1003 does not exist/);
    });
  });

  describe("#lockAssetReference", () => {
    it("should lock an asset reference", async () => {
      await contract.LockAssetReference(ctx, "1001");
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1001",
        Buffer.from(
          `{"id":"1001","isLocked":true,"numberTokens":10,"recipient":"${USER_A_FABRIC_ID}"}`,
        ),
      );
    });

    it("should throw an error for an asset reference that does not exist", async () => {
      await contract
        .LockAssetReference(ctx, "1003")
        .should.be.rejectedWith(/The asset reference 1003 does not exist/);
    });

    it("should throw an error for an asset reference already locked", async () => {
      await contract
        .LockAssetReference(ctx, "1002")
        .should.be.rejectedWith(/The asset reference 1002 is already locked/);
    });
  });

  describe("#unlockAssetReference", () => {
    it("should unlock an asset reference", async () => {
      await contract.UnlockAssetReference(ctx, "1002");
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1002",
        Buffer.from(
          `{"id":"1002","isLocked":false,"numberTokens":30,"recipient":"${USER_A_FABRIC_ID}"}`,
        ),
      );
    });

    it("should throw an error for an asset reference that does not exist", async () => {
      await contract
        .UnlockAssetReference(ctx, "1003")
        .should.be.rejectedWith(/The asset reference 1003 does not exist/);
    });
  });

  describe("#deleteAssetReference", () => {
    it("should delete an asset reference", async () => {
      await contract.DeleteAssetReference(ctx, "1001");
      ctx.stub.deleteState.should.have.been.calledOnceWithExactly("1001");
    });

    it("should throw an error for an asset reference that does not exist", async () => {
      await contract
        .DeleteAssetReference(ctx, "1003")
        .should.be.rejectedWith(/The asset reference 1003 does not exist/);
    });
  });

  describe("#GetBridgedOutAmount", () => {
    it("should increase bridged out amount", async () => {
      await contract.IncreaseBridgedAmount(ctx, 1001);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        bridgedOutAmountKey,
        Buffer.from("1051"),
      );
    });

    it("should decrease bridged out amount", async () => {
      await contract.DecreaseBridgedAmount(ctx, 10);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        bridgedOutAmountKey,
        Buffer.from("40"),
      );
    });

    it("should thrown an error trying to decrease bridged out", async () => {
      await contract
        .DecreaseBridgedAmount(ctx, 100)
        .should.be.rejectedWith(/Bridged back too many tokens/);
    });

    it("should throw an error for an asset reference that does not exist", async () => {
      await contract
        .DeleteAssetReference(ctx, "1003")
        .should.be.rejectedWith(/The asset reference 1003 does not exist/);
    });
  });

  describe("#Refund", () => {
    it("should decrease bridged out amount", async () => {
      await contract.Refund(ctx, 20, USER_A_FABRIC_ID, USER_A_ETH_ADDRESS);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        bridgedOutAmountKey,
        Buffer.from("30"),
      );
    });
  });

  describe("#checkValidTransfer", () => {
    const assetID = "1001";
    const amount1 = "10";
    const amount2 = "500";

    it("should be a valid transfer bridging out CBDC to own address", async () => {
      await contract.CheckValidBridgeOut(
        ctx,
        assetID,
        amount1,
        USER_A_FABRIC_ID,
        USER_A_ETH_ADDRESS,
      ).should.not.be.rejected;
    });

    it("should throw an error transfer CBDC escrowed by another user", async () => {
      await contract
        .CheckValidBridgeOut(
          ctx,
          assetID,
          amount1,
          "USER_B_FABRIC_ID",
          USER_A_ETH_ADDRESS,
        )
        .should.be.rejectedWith(
          /it is not possible to transfer tokens escrowed by another user/,
        );
    });

    it("should throw an error bridging out more than the escrowed CBDC", async () => {
      await contract
        .CheckValidBridgeOut(
          ctx,
          assetID,
          amount2,
          USER_A_FABRIC_ID,
          USER_A_ETH_ADDRESS,
        )
        .should.be.rejectedWith(
          /it is not possible to transfer a different amount of CBDC than the ones escrowed/,
        );
    });
  });

  describe("#operations", () => {
    const number1 = 10;
    const number2 = 500;

    it("add two numbers", () => {
      const result = contract.add(number1, number2);
      chai.expect(result).to.equal(number1 + number2);
    });

    it("subtract two numbers", () => {
      const result = contract.sub(number2, number1);
      chai.expect(result).to.equal(number2 - number1);
    });
  });

  describe("#checkPermission", () => {
    it("user from organization other than Org2 is not authorized to perform operations", () => {
      ctx.clientIdentity.getMSPID.resolves("Org1MSP");
      contract
        .LockAssetReference(ctx, "1001")
        .should.be.rejectedWith(
          `client is not authorized to perform the operation. Org1MSP != "Org2MSP"`,
        );
    });
  });
});
