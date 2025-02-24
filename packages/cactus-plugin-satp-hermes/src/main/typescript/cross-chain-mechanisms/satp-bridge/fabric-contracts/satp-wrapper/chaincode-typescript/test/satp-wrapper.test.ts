/*
 * SPDX-License-Identifier: Apache 2.0
 */

import { Context } from "fabric-contract-api";
import { ChaincodeStub, ClientIdentity } from "fabric-shim";
import { SATPContractWrapper } from "../src/satp-wrapper";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { TokenType } from "../src/token";

const bridgedOutAmountKey = "amountBridgedOut";

const USER_A_FABRIC_ID =
  "x509::/OU=org1/OU=client/OU=department1/CN=userA::/C=US/ST=North Carolina/L=Durham/O=org1.example.com/CN=ca.org1.example.com";

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe("Wrapper", () => {
  let ctx;
  let contract: SATPContractWrapper;

  beforeEach(() => {
    contract = new SATPContractWrapper("bridge_address");
    ctx = sinon.createStubInstance(Context);
    ctx.stub = sinon.createStubInstance(ChaincodeStub);
    ctx.clientIdentity = sinon.createStubInstance(ClientIdentity);

    ctx.clientIdentity.getMSPID.resolves("bridge");
    ctx.stub.getState.withArgs(bridgedOutAmountKey).resolves(Buffer.from("50"));
    ctx.stub.getState
      .withArgs("1001")
      .resolves(
        Buffer.from(
          `{"address":"token_address","tokenType":"ERC20","tokenId":1001,"owner":"${USER_A_FABRIC_ID}","channelName":"channel","contractName":"contract","amount":0}`,
        ),
      );
    ctx.stub.getState
      .withArgs("1002")
      .resolves(
        Buffer.from(
          `{"address":"token_address","tokenType":"ERC20","tokenId":1002,"owner":"${USER_A_FABRIC_ID}","channelName":"channel2","contractName":"contract2","amount":99}`,
        ),
      );

    ctx.stub.getState.withArgs("owner").resolves("Org1MSP");
    ctx.stub.getState.withArgs("bridge").resolves("bridge");
  });

  describe("#tokenExists", () => {
    it("should return true for a token reference", async () => {
      (await contract.getToken(ctx, "1001")).should.not.be.undefined;
    });

    it("should throw an error for a token reference that does not exist", async () => {
      await contract
        .getToken(ctx, "1003")
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });
  });

  describe("#wrap", () => {
    it("should wrap an asset", async () => {
      await contract.wrap(
        ctx,
        "chainCodeID",
        TokenType.ERC20,
        "1003",
        USER_A_FABRIC_ID,
        "channelName",
        "contractName",
      );
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1003",
        Buffer.from(
          `{"address":"chainCodeID","tokenType":"ERC20","tokenId":"1003","owner":"${USER_A_FABRIC_ID}","channelName":"channelName","contractName":"contractName","amount":0}`,
        ),
      );
    });
    it("should throw an error for an asset that already exists", async () => {
      await contract
        .wrap(
          ctx,
          "chainCodeID",
          TokenType.ERC20,
          "1001",
          USER_A_FABRIC_ID,
          "channelName",
          "contractName",
        )
        .should.be.rejectedWith(/Asset with ID 1001 is already wrapped/);
    });
  });

  describe("#unwrap", () => {
    it("should delete an asset reference", async () => {
      await contract.unwrap(ctx, "1001");
      ctx.stub.deleteState.should.have.been.calledOnceWithExactly("1001");
    });

    it("should throw an error for an asset reference that does not exist", async () => {
      await contract
        .unwrap(ctx, "1003")
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });

    it("should throw an error for an asset reference with locked amount", async () => {
      await contract
        .unwrap(ctx, "1002")
        .should.be.rejectedWith(/Token has locked amount/);
    });
  });

  describe("#createAssetReference", () => {
    it("should create an asset reference", async () => {
      await contract.wrap(
        ctx,
        "chainCodeID",
        TokenType.ERC20,
        "1003",
        USER_A_FABRIC_ID,
        "channelName",
        "contractName",
      );
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1003",
        Buffer.from(
          `{"address":"chainCodeID","tokenType":"ERC20","tokenId":"1003","owner":"${USER_A_FABRIC_ID}","channelName":"channelName","contractName":"contractName","amount":0}`,
        ),
      );
    });

    it("should throw an error for an asset reference that already exists", async () => {
      await contract
        .wrap(
          ctx,
          "chainCodeID",
          TokenType.ERC20,
          "1001",
          USER_A_FABRIC_ID,
          "channelName",
          "contractName",
        )
        .should.be.rejectedWith(/Asset with ID 1001 is already wrapped/);
    });
  });

  describe("#getToken", () => {
    it("should return a token reference", async () => {
      await contract.getToken(ctx, "1001").should.eventually.deep.equal({
        address: "token_address",
        tokenType: TokenType.ERC20,
        tokenId: 1001,
        owner: USER_A_FABRIC_ID,
        channelName: "channel",
        contractName: "contract",
        amount: 0,
      });
    });

    it("should throw an error for a token reference that does not exist", async () => {
      await contract
        .getToken(ctx, "1003")
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });
  });

  describe("#IsLocked", () => {
    it("should return true for a locked asset reference", async () => {
      const result1 = await contract.lockedAmount(ctx, "1001");
      const result2 = await contract.lockedAmount(ctx, "1002");
      chai.expect(result1).to.be.equal(0);
      chai.expect(result2).to.be.equal(99);

      await contract
        .lockedAmount(ctx, "1003")
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });
  });

  describe("#lockAsset", () => {
    it("should lock an asset", async () => {
      ctx.stub.invokeChaincode
        .withArgs(
          "contract",
          ["transfer", USER_A_FABRIC_ID, "bridge", "10"],
          "channel",
        )
        .resolves({ status: 200 });
      await contract.lock(ctx, "1001", 10);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1001",
        Buffer.from(
          `{"address":"token_address","tokenType":"ERC20","tokenId":1001,"owner":"${USER_A_FABRIC_ID}","channelName":"channel","contractName":"contract","amount":10}`,
        ),
      );
    });

    it("should throw and error if response status is different from 200", async () => {
      ctx.stub.invokeChaincode
        .withArgs(
          "contract",
          ["transfer", USER_A_FABRIC_ID, "bridge", "10"],
          "channel",
        )
        .resolves({ status: 404 });
      await contract
        .lock(ctx, "1001", 10)
        .should.be.rejectedWith(/Lock failed/);
    });

    it("should throw an error for an asset reference that does not exist", async () => {
      await contract
        .lock(ctx, "1003", 2)
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });
  });

  describe("#unlockAsset", () => {
    it("should unlock an asset", async () => {
      ctx.stub.invokeChaincode
        .withArgs("contract2", ["Approve", "bridge", "30"], "channel2")
        .resolves({ status: 200 });
      ctx.stub.invokeChaincode
        .withArgs(
          "contract2",
          ["transfer", USER_A_FABRIC_ID, "bridge", "30"],
          "channel2",
        )
        .resolves({ status: 200 });
      await contract.unlock(ctx, "1002", 30);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1002",
        Buffer.from(
          `{"address":"token_address","tokenType":"ERC20","tokenId":1002,"owner":"${USER_A_FABRIC_ID}","channelName":"channel2","contractName":"contract2","amount":69}`,
        ),
      );
    });

    it("should throw and error if the amount to unlock is greater than the locked amount", async () => {
      await contract
        .unlock(ctx, "1002", 100)
        .should.be.rejectedWith(
          /No sufficient amount locked, total tried to unlock: 100 total locked: 99/,
        );
    });

    it("should throw an error if approve response status is different from 200", async () => {
      ctx.stub.invokeChaincode
        .withArgs("contract2", ["Approve", "bridge", "30"], "channel2")
        .resolves({ status: 404 });
      await contract
        .unlock(ctx, "1002", 30)
        .should.be.rejectedWith(/Approve failed/);
    });

    it("should throw an error if transfer response status is different from 200", async () => {
      ctx.stub.invokeChaincode
        .withArgs("contract2", ["Approve", "bridge", "30"], "channel2")
        .resolves({ status: 200 });
      ctx.stub.invokeChaincode
        .withArgs(
          "contract2",
          ["transfer", USER_A_FABRIC_ID, "bridge", "30"],
          "channel2",
        )
        .resolves({ status: 404 });
      await contract
        .unlock(ctx, "1002", 30)
        .should.be.rejectedWith(/Unlock failed/);
    });

    it("should throw an error for an asset that does not exist", async () => {
      await contract
        .unlock(ctx, "1003", 99)
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });
  });

  describe("#mint", () => {
    it("should mint an asset", async () => {
      ctx.stub.invokeChaincode
        .withArgs("contract", ["mint", "10"], "channel")
        .resolves({ status: 200 });
      await contract.mint(ctx, "1001", 10);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1001",
        Buffer.from(
          `{"address":"token_address","tokenType":"ERC20","tokenId":1001,"owner":"${USER_A_FABRIC_ID}","channelName":"channel","contractName":"contract","amount":10}`,
        ),
      );
    });
    it("should throw and error if status response is different from 200", async () => {
      ctx.stub.invokeChaincode
        .withArgs("contract", ["mint", "10"], "channel")
        .resolves({ status: 404 });
      await contract
        .mint(ctx, "1001", 10)
        .should.be.rejectedWith(/Mint failed/);
    });
    it("should throw an error for an asset that does not exist", async () => {
      await contract
        .burn(ctx, "1003", 2)
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });
  });

  describe("#burn", () => {
    it("should burn an asset", async () => {
      ctx.stub.invokeChaincode
        .withArgs("contract2", ["burn", "10"], "channel2")
        .resolves({ status: 200 });
      await contract.burn(ctx, "1002", 10);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1002",
        Buffer.from(
          `{"address":"token_address","tokenType":"ERC20","tokenId":1002,"owner":"${USER_A_FABRIC_ID}","channelName":"channel2","contractName":"contract2","amount":89}`,
        ),
      );
    });

    it("should throw an error if the amount to burn is greater than the locked amount", async () => {
      await contract
        .burn(ctx, "1002", 100)
        .should.be.rejectedWith(/No sufficient amount locked/);
    });

    it("should throw and error if status response is different from 200", async () => {
      ctx.stub.invokeChaincode
        .withArgs("contract2", ["burn", "10"], "channel2")
        .resolves({ status: 404 });
      await contract
        .burn(ctx, "1002", 10)
        .should.be.rejectedWith(/Burn failed/);
    });

    it("should throw an error for an asset that does not exist", async () => {
      await contract
        .burn(ctx, "1003", 2)
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });
  });

  describe("#assign", () => {
    it("should assign an asset", async () => {
      ctx.stub.invokeChaincode
        .withArgs(
          "contract2",
          ["assign", "bridge", USER_A_FABRIC_ID, "99"],
          "channel2",
        )
        .resolves({ status: 200 });
      await contract.assign(ctx, "1002", USER_A_FABRIC_ID, 99);
      ctx.stub.putState.should.have.been.calledOnceWithExactly(
        "1002",
        Buffer.from(
          `{"address":"token_address","tokenType":"ERC20","tokenId":1002,"owner":"${USER_A_FABRIC_ID}","channelName":"channel2","contractName":"contract2","amount":0}`,
        ),
      );
    });

    it("should throw an error when the response is not 200", async () => {
      ctx.stub.invokeChaincode
        .withArgs(
          "contract2",
          ["assign", "bridge", USER_A_FABRIC_ID, "99"],
          "channel2",
        )
        .resolves({ status: 404 });
      await contract
        .assign(ctx, "1002", USER_A_FABRIC_ID, 99)
        .should.be.rejectedWith(/Assign failed/);
    });

    it("should throw an error for an asset that does not exist", async () => {
      await contract
        .assign(ctx, "1003", USER_A_FABRIC_ID, 10)
        .should.be.rejectedWith(/Asset with ID 1003 does not exist/);
    });

    it("should throw an error if no amount available to assign", async () => {
      await contract
        .assign(ctx, "1002", USER_A_FABRIC_ID, 100)
        .should.be.rejectedWith(/No sufficient amount locked/);
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
        .lock(ctx, "1001", 10)
        .should.be.rejectedWith(
          `client is not authorized to perform the operation. Org1MSP"`,
        );
    });
  });
});
