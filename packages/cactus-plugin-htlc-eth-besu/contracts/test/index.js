const truffleAssert = require("truffle-assertions");
const HashTimeLock = artifacts.require("HashTimeLock");
const { SECONDS_IN_ONE_MINUTE } = require("./constants.js");
const { id, secret, invalidSecret, mockNewContract } = require("./mockData.js");
const { getTimestamp, timeout } = require("./helpers");
const statuses = require("./statuses");
const { ACTIVE, REFUNDED, WITHDRAWN } = require("./constants.js");

// Unit tests wrapper
contract("HashTimeLock", () => {
  let contractInstance;
  let txHash;

  beforeEach(async () => {
    contractInstance = await HashTimeLock.new();
  });

  // Deploy contract
  it("should deploy contract", async () => {
    assert(
      contractInstance.address !== "",
      `Expected valid hash for address, got ${contractInstance.address} instead`
    );
  });

  // Contract exists
  it("should return error, because contract doesn't exist yet", async () => {
    const contractExists = await contractInstance.contractExists(id);
    assert(!contractExists, `Expected false, got ${contractExists} instead`);
  });

  // New contract
  it("should create new contract", async () => {
    const newContract = await contractInstance.newContract(
      ...Object.values(mockNewContract),
      { value: 1 }
    );

    txHash = newContract.logs[0].transactionHash;

    const contractId = newContract.logs[0].args.id;
    const contractExists = await contractInstance.contractExists(contractId);
    assert(contractExists, `Expected true, got ${contractExists} instead`);
  });

  // Get one status
  it("should get one status", async () => {
    const newContract = await contractInstance.newContract(
      ...Object.values(mockNewContract),
      { value: 1 }
    );

    const contractId = newContract.logs[0].args.id;
    const getOneStatus = await contractInstance.getSingleStatus(contractId);

    assert(
      statuses[parseInt(getOneStatus)] === ACTIVE,
      `Expected ACTIVE, got ${statuses[parseInt(getOneStatus)]} instead`
    );
  });

  // Successful withdraw
  it("should withdraw", async () => {
    const timestamp = await getTimestamp(txHash);
    const {
      outputAmount,
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
    } = mockNewContract;

    const newContract = await contractInstance.newContract(
      outputAmount,
      (timestamp + SECONDS_IN_ONE_MINUTE).toString(),
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
      { value: 1 }
    );

    const contractId = newContract.logs[0].args.id;
    await contractInstance.withdraw(contractId, secret);

    const getOneStatus = await contractInstance.getSingleStatus(contractId);

    assert(
      statuses[parseInt(getOneStatus)] === WITHDRAWN,
      `Expected WITHDRAWN, got ${statuses[parseInt(getOneStatus)]} instead`
    );
  });

  // Unsuccessful withdraw (invalid secret)
  it("should revert withdraw, because secret is invalid", async () => {
    const timestamp = await getTimestamp(txHash);
    const {
      outputAmount,
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
    } = mockNewContract;

    const newContract = await contractInstance.newContract(
      outputAmount,
      (timestamp + SECONDS_IN_ONE_MINUTE).toString(),
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
      { value: 1 }
    );

    const contractId = newContract.logs[0].args.id;

    await truffleAssert.reverts(
      contractInstance.withdraw(contractId, invalidSecret)
    );
  });

  // Unsuccessful withdraw (expiration time passed)
  it("should revert withdraw, because expiration time has passed", async () => {
    const timestamp = await getTimestamp(txHash);
    const {
      outputAmount,
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
    } = mockNewContract;

    const time = timestamp + 5;

    const newContract = await contractInstance.newContract(
      outputAmount,
      time,
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
      { value: 1 }
    );

    const contractId = newContract.logs[0].args.id;
    await timeout(5000);

    await truffleAssert.reverts(contractInstance.withdraw(contractId, secret));
  });

  // Successful refund
  it("should refund", async () => {
    const timestamp = await getTimestamp(txHash);
    const {
      outputAmount,
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
    } = mockNewContract;

    const time = timestamp + 10;

    const newContract = await contractInstance.newContract(
      outputAmount,
      time,
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
      { value: 1 }
    );

    const contractId = newContract.logs[0].args.id;
    await timeout(5000);
    await contractInstance.refund(contractId);

    const getOneStatus = await contractInstance.getSingleStatus(contractId);

    assert(
      statuses[parseInt(getOneStatus)] === REFUNDED,
      `Expected REFUNDED, got ${statuses[parseInt(getOneStatus)]} instead`
    );
  });

  // Unsuccessful refund (expiration time hasn't passed)
  it("should revert refund, because expiration time hasn't passed yet", async () => {
    const timestamp = await getTimestamp(txHash);
    const {
      outputAmount,
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
    } = mockNewContract;
    const newContract = await contractInstance.newContract(
      outputAmount,
      (timestamp + 1000).toString(),
      hashLock,
      receiverAddress,
      outputNetwork,
      outputAddress,
      { value: 1 }
    );

    const contractId = newContract.logs[0].args.id;
    await truffleAssert.reverts(contractInstance.refund(contractId));
  });
});
