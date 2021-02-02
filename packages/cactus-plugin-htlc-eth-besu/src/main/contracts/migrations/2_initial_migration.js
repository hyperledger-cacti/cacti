const HashTimeLock = artifacts.require("HashTimeLock");
const DemoHelpers = artifacts.require("DemoHelpers");
module.exports = function (deployer) {
  deployer.deploy(HashTimeLock);
  deployer.deploy(DemoHelpers);
};
