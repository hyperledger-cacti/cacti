const HashTimeLock = artifacts.require("HashTimeLock");

module.exports = function(deployer) {
  deployer.deploy(HashTimeLock);
};
